import Params from './Params.js'
import {ParamsMeta} from './Params.js'
import * as Gui from '../PopEngineCommon/PopWebGuiApi.js'
import * as Opengl from '../PopEngineCommon/PopWebOpenglApi.js'
import PopImage from '../PopEngineCommon/PopWebImageApi.js'
import {CreateRandomImage,CreateColourTexture} from '../PopEngineCommon/Images.js'
import {GetIndexArray} from '../PopEngineCommon/PopApi.js'
import {Yield} from '../PopEngineCommon/PopWebApi.js'
import {CreateBlitQuadGeometry} from '../PopEngineCommon/CommonGeometry.js'

const SdfTarget = CreateRandomImage(128,128,'Float4');
const ParticleOriginalPositions = CreateRandomImage(32,32,'Float4');
let ParticleNextPositions = null;
let ParticlePrevPositions = null;
let ParticlePrevVelocitys = CreateRandomImage(ParticleOriginalPositions.GetWidth(),ParticleOriginalPositions.GetHeight(),'Float4');
let ParticleNextVelocitys = null;
SdfTarget.SetLinearFilter(true);
//	todo: integrate this into context
import AssetManager from '../PopEngineCommon/AssetManager.js'

async function GetQuadGeoBuffer(RenderContext)
{
	const Geo = CreateBlitQuadGeometry([0,0,1,1],'LocalUv');
	const Buffer = await RenderContext.CreateGeometry(Geo);
	return Buffer;
}

let ParticleShader = AssetManager.RegisterShaderAssetFilename('Logo/Particle.frag.glsl','Logo/Particle.vert.glsl');
let RenderShader = AssetManager.RegisterShaderAssetFilename('Logo/Render.frag.glsl','Logo/Render.vert.glsl');
let QuadGeo = 'Quad';
AssetManager.RegisterAssetAsyncFetchFunction(QuadGeo,GetQuadGeoBuffer);

let UpdateVelocitysShader = AssetManager.RegisterShaderAssetFilename('Logo/UpdateVelocity.frag.glsl','Logo/UpdatePhysics.vert.glsl');
let UpdatePositionsShader = AssetManager.RegisterShaderAssetFilename('Logo/UpdatePosition.frag.glsl','Logo/UpdatePhysics.vert.glsl');



function UpdatePhysicsVelocitys(RenderToScreen)
{
	if ( ParticleNextVelocitys && ParticleNextVelocitys.OpenglVersion )
	{
		let x = ParticleNextVelocitys;
		ParticleNextVelocitys = ParticlePrevVelocitys;
		ParticlePrevVelocitys = x;
	}

	//	no buffer to render to, make one
	if ( !ParticleNextVelocitys )
	{
		ParticleNextVelocitys = new PopImage();
		//	copy dimensions, dont care about content
		ParticleNextVelocitys.Copy( ParticlePrevVelocitys );
	}

	const Clear = ['SetRenderTarget',RenderToScreen?null:ParticleNextVelocitys,[0,1,0,1]];
	const Uniforms = Object.assign({},Params);
	Uniforms.LastVelocitys = ParticlePrevVelocitys;
	Uniforms.LastPositions = ParticlePrevPositions ? ParticlePrevPositions : ParticleOriginalPositions;
	Uniforms.OrigPositions = ParticleOriginalPositions;
	const Draw = ['Draw',QuadGeo,UpdateVelocitysShader,Uniforms];

	return [Clear,Draw];
}

function UpdatePhysicsPositions(RenderToScreen)
{
	if ( ParticleNextPositions && ParticleNextPositions.OpenglVersion )
	{
		//	flip sources (todo: explicitly AFTER rendering?)
		let x = ParticleNextPositions;
		ParticleNextPositions = ParticlePrevPositions;
		ParticlePrevPositions = x;
	}

	//	no buffer to render to, make one
	if ( !ParticleNextPositions )
	{
		ParticleNextPositions = new PopImage();
		//	copy dimensions, dont care about content
		ParticleNextPositions.Copy( ParticleOriginalPositions );
	}

	const Clear = ['SetRenderTarget',RenderToScreen?null:ParticleNextPositions,[0,1,0,1]];
	const Uniforms = Object.assign({},Params);
	Uniforms.LastPositions = ParticlePrevPositions ? ParticlePrevPositions : ParticleOriginalPositions;
	Uniforms.OrigPositions = ParticleOriginalPositions;
	Uniforms.Velocitys = ParticleNextVelocitys;
	//Uniforms.LastPositions = ParticleOriginalPositions;
	const Draw = ['Draw',QuadGeo,UpdatePositionsShader,Uniforms];

	return [Clear,Draw];
}

function UpdatePhysics(RenderToScreen)
{
	const VelocityUpdate = UpdatePhysicsVelocitys();
	const PositionUpdate = UpdatePhysicsPositions();
	return [...VelocityUpdate,...PositionUpdate];
}

async function UpdateSdf(RenderToScreen)
{
	const Clear = ['SetRenderTarget',RenderToScreen?null:SdfTarget,[1,0,0,1]];
	
	//	render points
	const Uniforms = Object.assign({},Params);
	const PositionsTexture = ParticleNextPositions || ParticleOriginalPositions;
	Uniforms.ParticlePositions = PositionsTexture;
	Uniforms.ParticlePositionsWidth = PositionsTexture.GetWidth();
	Uniforms.ParticlePositionsHeight = PositionsTexture.GetHeight();
	
	Uniforms.ParticleIndex = GetIndexArray( PositionsTexture.GetWidth()*PositionsTexture.GetHeight() );
	const State = {};
	State.BlendMode = 'Min';
	
	const Draw = ['Draw',QuadGeo,ParticleShader,Uniforms,State];
	
	return [Clear,Draw];
}

import {GetTimeNowMs} from '../PopEngineCommon/PopWebApiCore.js';
async function GetRenderLogoCommands()
{
	const Clear = ['SetRenderTarget',null,[0,1,0,1]];
	
	//	render points
	const Uniforms = Object.assign({},Params);
	Uniforms.SdfPointsTexture = SdfTarget;
	Uniforms.SdfPointsTextureSize = [SdfTarget.GetWidth(),SdfTarget.GetHeight()];
	
	Uniforms.TimeSecs = GetTimeNowMs() / 1000.0;
	
	const Draw = ['Draw',QuadGeo,RenderShader,Uniforms];
	
	return [Clear,Draw];
}


async function GetRenderCommands()
{
	const Commands = [];
	
	const PhysicsCommands = UpdatePhysics( Params.DebugPhysics );
	const SdfCommands = await UpdateSdf( Params.DebugSdf );
	const RenderCommands = await GetRenderLogoCommands();
	Commands.push( ...PhysicsCommands );
	Commands.push( ...SdfCommands );
	if ( !Params.DebugSdf && !Params.DebugPhysics )
		Commands.push( ...RenderCommands );
	
	return Commands;
}

//	todo: move asset manager for rendering to rendercontext
//		and resolve these lower level, to make rendercommands simpler.
//		still leaves the problem of textures?
function ResovleCommandAssets(Commands,Context)
{
	function ResolveCommand(Command)
	{
		if ( Command[0] == 'Draw' )
		{
			//	geo
			Command[1] = AssetManager.GetAsset( Command[1], Context );
			//	shader
			Command[2] = AssetManager.GetAsset( Command[2], Context );
		}
		return Command;
	}
	Commands.forEach( ResolveCommand );
}

function OnMouseMove(x,y,Button)
{
	const RenderView = this;
	const Rect = RenderView.GetScreenRect();
	//console.log(`OnMouseMove`,...arguments);
	const u = x / Rect[2];
	let v = y / Rect[3];
	v = 1-v;
	Params.RepelPosition = [u,v];
}

async function RenderThread()
{
	const RenderView = new Gui.RenderView(null,'Logo');
	
	RenderView.OnMouseMove = OnMouseMove.bind(RenderView);
	
	const RenderContext = new Opengl.Context(RenderView);
	while ( RenderView )
	{
		try
		{
			const Commands = await GetRenderCommands();
			ResovleCommandAssets(Commands,RenderContext);
			await RenderContext.Render(Commands);
		}
		catch(e)
		{
			console.error(e);
			await Yield(200);
		}
	}
}

let ParamsTree;
function InitParamsGui()
{
	ParamsTree = new Gui.Tree(null,'Params');
	
	const DefaultMeta = {};
	DefaultMeta.Writable = true;
	for ( let Param in Params )
	{
		let Meta = ParamsMeta[Param] || {};
		Meta = Object.assign( Meta, DefaultMeta );
		ParamsMeta[Param] = Meta;
	}
	
	ParamsTree.Element.meta = ParamsMeta;
	ParamsTree.Element.json = Params;
	
	function OnParamsChanged(NewParams,Change)
	{
		Object.assign(Params,NewParams);
	}
	ParamsTree.Element.onchange = OnParamsChanged;
}

export default async function Bootup()
{
	InitParamsGui();
	RenderThread();
	

}
