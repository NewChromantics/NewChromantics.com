const Assets = {};				//	Assets[Context][Name]
const AssetFetchFunctions = {};	//	AssetFetchFunctions[Name] = function

//	for shaders (later more files?) multiple-filenames => asset name need to be identifiable/split/joined but we
//	need to distinguish them from valid filename chars. Not much in unix/osx is invalid...
const AssetFilenameJoinString = ':';

//	external promise (WaitForFileChanged() returns promise) can make us auto-reload assets
async function AutoInvalidateAssetsOnFileChanged(WaitForFileChanged)
{
	while(true)
	{
		const File = await WaitForFileChanged();
		const Filename = File.Filename;
		const Contents = File.Contents;
		const ForceInvalidation = false;
		InvalidateAsset( Filename, ForceInvalidation, File );
	}
}




let AssetServerAttempts = 0;
function GetAssetServerAddress()
{
	const AssetServerPortCount = 10;
	const Host = 'localhost';
	const Port = 0xF11E + (AssetServerAttempts%AssetServerPortCount);
	AssetServerAttempts++;
	return [Host,Port];
}

//	promise queue for changed files for anything that
//	wants to know of file changes, but not using GetAsset (but they should)
const AssetServerFileChangeQueue = new Pop.PromiseQueue();

async function WaitAssetServerFileChange(Filename)
{
	while(true)
	{
		const ChangedFilename = await AssetServerFileChangeQueue.WaitForNext();
		if ( ChangedFilename != Filename )
		{
			Pop.Debug(`${ChangedFilename} changed, waiting for ${Filename}`);
			continue;
		}
		return Filename;
	}
}

async function StartHotReloadAssets()
{
	//	loop looking for a server
	AssetServerLoop(GetAssetServerAddress,OnRemoteFileChanged).then(Pop.Warning).catch(Pop.Debug);
}

async function AssetServerLoop(GetNextAddress,OnFileChanged,FilenameFilter)
{
	if ( !FilenameFilter )
		FilenameFilter = function(){	return true;	};
	
	
	function HandleAssetFileMessage(Packet)
	{
		function GetMeta(Data)
		{
			//	data should start with file meta
			const BraceBytes = Pop.StringToBytes('{}');
			const LeftBraceByte = BraceBytes[0];
			const RightBraceByte = BraceBytes[1];
			if ( Data[0] != LeftBraceByte )
			{
				const Data0Char = Pop.BytesToString(Data.slice(1));
				throw `File packet should start with ${Pop.BytesToString(LeftBraceByte)} for meta, but is ${Data0Char}`;
			}
			let BraceCount = 1;
			let MetaLength = 1;
			for ( MetaLength=1;	MetaLength<Data.length;	MetaLength++ )
			{
				let i = MetaLength;
				if ( Data[i] == LeftBraceByte )		BraceCount++;
				if ( Data[i] == RightBraceByte )	BraceCount--;
				if ( BraceCount == 0 )
				{
					MetaLength++;
					break;
				}
			}
			if ( BraceCount != 0 )
			{
				const Preview = Pop.BytesToString(Data.slice(30));
				throw `File packet meta mismatched braces (${BraceCount}); ${Preview}`;
			}
			const MetaBytes = Data.slice(0,MetaLength);
			const MetaJson = Pop.BytesToString(MetaBytes);
			const Meta = JSON.parse(MetaJson);
			//	need to get this data back out
			Meta.PacketDataHeaderSize = MetaLength;
			return Meta;
		}
		
		const Meta = GetMeta(Packet.Data);
		const HeaderSize = Meta.PacketDataHeaderSize;
		const Contents = Packet.Data.slice(HeaderSize);
		const Preview = (typeof Packet.Data=='string') ? Packet.Data.substring(0,20) : Array.from(Contents.slice(0,20));
		Pop.Debug(`Got new file for ${JSON.stringify(Meta)}; ${Preview}`);
		
		OnFileChanged( Meta.Filename, Contents );
	}
	
	async function HandleAssetMessage(Socket)
	{
		const Packet = await Socket.WaitForMessage();
		
		//	if the packet is binary, it's a file
		if ( typeof Packet.Data != 'string' )
		{
			try
			{
				return HandleAssetFileMessage(Packet);
			}
			catch(e)
			{
				Pop.Debug(`Error with file packet; ${e}`);
				return;
			}
		}
		
		
		//	expecting a json command
		const Message = JSON.parse(Packet.Data);
		//	gracefully ignore unexpected messages
		if ( Message.Command != 'FileChanged' )
		{
			Pop.Debug(`Unhandled command ${Packet.Data}`);
			return;
		}
		
		function RequestFile(Filename)
		{
			const ShouldFetch = FilenameFilter(Filename);
			Pop.Debug(`${Filename} has changed; Fetching=${ShouldFetch}`);
			if ( !ShouldFetch )
				return;
		
			//	we want the file, request its contents immediately and immediately wait for reply
			//	gr: in practise, this is going to go wrong, the server might send multiple notifications
			//		before it gets our request; just insert some meta in asset packets, or have a websocket stream("protocol")
			//		just for asset contents
			const Request = {};
			Request.Command = 'RequestFile';
			Request.Filename = Filename;
			Socket.Send(Packet.Peer,JSON.stringify(Request));
		}
		const Filenames = Array.isArray(Message.Filename) ? Message.Filename : [Message.Filename];
		Filenames.forEach(RequestFile);
	}
	
	//	gr: this pattern (while1, get address, connection, send loop, recv & relay loop)
	//		has become very common... wrap it?
	while ( true )
	{
		try
		{
			const Address = GetNextAddress();
			const Socket = new Pop.Websocket.Client(Address[0],Address[1]);
			await Socket.WaitForConnect();
			Pop.Debug(`Connected to asset server @${Address[0]}:${Address[1]}`);
			
			//	request all files
			{
				const Request = {};
				Request.Command = 'RequestList';
				const Peer = Socket.GetPeers()[0];
				Socket.Send(Peer,JSON.stringify(Request));
			}
			
			while(true)
			{
				await HandleAssetMessage(Socket);
			}
		}
		catch(e)
		{
			Pop.Debug(`Error with asset server connection ${e}`);
			await Pop.Yield(500);
		}
	}
}


//	modify object, but don't store a reference to it! otherwise it wont garbage collect
var ContextUniqueHashCounter = 1000;
function GetContextUniqueHash(Object)
{
	let HashPrefix = 'object_hash#';
	
	//	the string is the hash
	if ( typeof Object == 'string' )
		return Object;
	
	if ( typeof Object != 'object' )
		throw "Need to work out how to store unique hash on a " + (typeof Object);
	
	//	objects are passed by reference, so we can add a hash
	if ( Object._UniqueHash !== undefined )
		return Object._UniqueHash;
	
	ContextUniqueHashCounter++;
	Object._UniqueHash = HashPrefix + ContextUniqueHashCounter;
	// Pop.Debug("Created new hash for object: " + Object._UniqueHash );
	
	return Object._UniqueHash;
}

function OnRemoteFileChanged(Name,Contents)
{
	//	this needs to update the Pop file cache now, which is currently web only
	//	todo: make the file cache generic, but web needs to write to it
	//	replace the file cache before invalidating etc, in case they reload old stuff
	Pop.SetFileCache(Name,Contents);
	
	//	gr: the above is now going to cause an invalidation
	//		if AutoInvalidateAssetsOnFileChanged is called
	//		comments above are now valid
	const ForceInvalidation = true;
	InvalidateAsset(Name,ForceInvalidation);
	
	AssetServerFileChangeQueue.Push(Name);
}

function OnAssetChanged(Name)
{
	//	this shouldn't really do anything any more, but could report to UI
}

function InvalidateAsset(Filename,ForceInvalidation=false,NewFileMeta=undefined)
{
	if ( !Filename )
		throw `InvalidateAsset(${Filename}) invalid filename`;
	Pop.Debug(`InvalidateAsset ${Filename}`);
	
	function InvalidateAssetInContext(Context)
	{
		const ContextKey = GetContextUniqueHash( Context );
		const ContextAssets = Assets[ContextKey];
		
		//	gr: cope with assetnames containing multiple filenames
		function ShouldInvalidateKey(AssetName)
		{
			const Filenames = AssetName.split(AssetFilenameJoinString);
			const AnyMatches = Filenames.some( f => f == Filename );
			return AnyMatches;
		}
		
		const InvalidateKeys = Object.keys( ContextAssets ).filter( ShouldInvalidateKey );
		if ( !InvalidateKeys.length )
		{
			// Pop.Debug("Context",Context," has no matching assets for ",Filename,Object.keys(ContextAssets));
			return;
		}
		
		function InvalidateKey(AssetName)
		{
			//	if we've reached this point, we have an asset
			const Asset = ContextAssets[AssetName];
			
			//	for streaming assets, we dont want to just destroy & reload the asset
			//	if we dont need to (ie, we already have enough data, like with audio, avoid re-seeking and clicking)
			if ( Asset.ShouldInvalidateWithNewFile )
			{
				if ( !ForceInvalidation && NewFileMeta )
				{
					if ( !Asset.ShouldInvalidateWithNewFile(Context,NewFileMeta.Contents,NewFileMeta) )
					{
						Pop.Debug(`Skipped asset invalidation ${Filename}`);
						return;
					}
				}
			}
			
			//	delete existing asset
			//	if it has a cleanup func, call it
			if ( Asset.Free )
			{
				Pop.Debug(`Freeing asset ${AssetName}...`);
				try
				{
					Asset.Free();
				}
				catch(e)
				{
					Pop.Debug(`Erroring freeing asset ${AssetName}: ${e}`);
				}
			}
			//	delete from context cache (note: must use array accessor!)
			delete ContextAssets[AssetName];
			Pop.Debug(`Invalidated ${AssetName} on ${Context}`,Context);
		}
		InvalidateKeys.forEach( InvalidateKey );
	}
	const AssetContexts = Object.keys(Assets);
	AssetContexts.forEach( InvalidateAssetInContext );
	
	//	todo; this should be OnAssetChanged(AssetName), not just filename (eg. shaders)
	//	so code above should accumulate unique asset name and then call here after
	OnAssetChanged(Filename);
}


function GetAsset(Name,RenderContext,LoadAsset=true)
{
	let ContextKey = GetContextUniqueHash( RenderContext );
	if ( !Assets.hasOwnProperty(ContextKey) )
		Assets[ContextKey] = {};
	
	let ContextAssets = Assets[ContextKey];
	
	if ( ContextAssets.hasOwnProperty(Name) )
		return ContextAssets[Name];
	
	if ( !AssetFetchFunctions.hasOwnProperty(Name) )
		throw "No known asset named "+ Name;
	
	if ( !LoadAsset )
		return null;
	
	// Pop.Debug("Generating asset "+Name+"...");
	const Timer_Start = Pop.GetTimeNowMs();
	ContextAssets[Name] = AssetFetchFunctions[Name]( RenderContext );
	const Timer_Duration = Math.floor(Pop.GetTimeNowMs() - Timer_Start);
	// Pop.Debug("Generating asset "+Name+" took "+Timer_Duration + "ms");
	OnAssetChanged( Name );
	return ContextAssets[Name];
}


