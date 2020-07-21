

//	gr: this shouldn't really be here, AssetCommon is for common (procedural) assets
//		this func is for File-system stuff
async function WaitForAssetsLoad(PreloadAssets)
{
	const PreloadPromises = PreloadAssets.map(Pop.LoadFileAsStringAsync);
	await Promise.all( PreloadPromises );
}



AssetFetchFunctions['Quad'] = GetQuadGeometry;
AssetFetchFunctions['Quadx50'] = GetQuadx50Geometry;

function GetQuadGeometry(RenderTarget)
{
	let VertexSize = 2;
	let l = 0;
	let t = 0;
	let r = 1;
	let b = 1;
	//let VertexData = [	l,t,	r,t,	r,b,	l,b	];
	let VertexData = [	l,t,	r,t,	r,b,	r,b, l,b, l,t	];
	let TriangleIndexes = [0,1,2,	2,3,0];
	
	const VertexAttributeName = "TexCoord";
	
	//	emulate webgl on desktop
	TriangleIndexes = undefined;
	
	let QuadGeometry = new Pop.Opengl.TriangleBuffer( RenderTarget, VertexAttributeName, VertexData, VertexSize, TriangleIndexes );
	return QuadGeometry;
}


function GetQuadx50Geometry(RenderTarget)
{
	//	u, v, quadindex
	let VertexSize = 3;
	let VertexData = [];
	
	function PushQuad(QuadIndex)
	{
		let l = 0;
		let t = 0;
		let r = 1;
		let b = 1;
		let QuadVertexData =
		[
		 l,t,QuadIndex,
		 r,t,QuadIndex,
		 r,b,QuadIndex,
		 
		 r,b,QuadIndex,
		 l,b,QuadIndex,
		 l,t,QuadIndex
		];
		VertexData.push(...QuadVertexData);
	}
	for ( let i=0;	i<50;	i++ )
		PushQuad(i);
	
	const VertexAttributeName = "TexCoord_QuadIndex";
	
	//	auto triangle indexes
	const TriangleIndexes = undefined;
	
	let QuadGeometry = new Pop.Opengl.TriangleBuffer( RenderTarget, VertexAttributeName, VertexData, VertexSize, TriangleIndexes );
	return QuadGeometry;
}


//	this returns the "asset name"
function RegisterShaderAssetFilename(FragFilename,VertFilename)
{
	const AssetName = FragFilename+AssetFilenameJoinString+VertFilename;
	
	function LoadAndCompileShader(RenderContext)
	{
		const FragShaderContents = Pop.LoadFileAsString(FragFilename);
		const VertShaderContents = Pop.LoadFileAsString(VertFilename);
		const Shader = Pop.GetShader( RenderContext, FragShaderContents, VertShaderContents, AssetName );
		return Shader;
	}
	
	//	we use / as its not a valid filename char
	if ( AssetFetchFunctions.hasOwnProperty(AssetName) )
		throw "Shader asset name clash, need to change the name we use";
	AssetFetchFunctions[AssetName] = LoadAndCompileShader;
	return AssetName;
}


