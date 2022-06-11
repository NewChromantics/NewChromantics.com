import Params from './Params.js'
import {ParamsMeta} from './Params.js'
import * as Gui from '../PopEngineCommon/PopWebGuiApi.js'
import * as Opengl from '../PopEngineCommon/PopWebOpenglApi.js'
import PopImage from '../PopEngineCommon/PopWebImageApi.js'
import {CreateRandomImage} from '../PopEngineCommon/Images.js'
import {GetIndexArray} from '../PopEngineCommon/PopApi.js'
import {Yield} from '../PopEngineCommon/PopWebApi.js'
import {CreateBlitQuadGeometry} from '../PopEngineCommon/CommonGeometry.js'

const SdfTarget = CreateRandomImage(512,512,'RGBA');
const PointPositions = CreateRandomImage(32,32,'RGBA');

//	todo: integrate this into context
import AssetManager from '../PopEngineCommon/AssetManager.js'

async function GetQuadGeoBuffer(RenderContext)
{
	const Geo = CreateBlitQuadGeometry([0,0,1,1],'LocalUv');
	const Buffer = await RenderContext.CreateGeometry(Geo);
	return Buffer;
}

let ParticleShader = AssetManager.RegisterShaderAssetFilename('Logo/Particle.frag.glsl','Logo/Particle.vert.glsl');
let QuadGeo = 'Quad';
AssetManager.RegisterAssetAsyncFetchFunction(QuadGeo,GetQuadGeoBuffer);



async function UpdateSdf()
{
	//const Clear = ['SetRenderTarget',SdfTarget,[1,0,0,1]];
	const Clear = ['SetRenderTarget',null,[1,0,0,1]];
	
	//	render points
	const Uniforms = Object.assign({},Params);
	Uniforms.ParticlePositions = PointPositions;
	Uniforms.ParticlePositionsWidth = PointPositions.GetWidth();
	Uniforms.ParticlePositionsHeight = PointPositions.GetHeight();
	
	Uniforms.ParticleIndex = GetIndexArray( PointPositions.GetWidth()*PointPositions.GetHeight() );
	const State = {};
	State.BlendMode = 'Min';
	
	const Draw = ['Draw',QuadGeo,ParticleShader,Uniforms,State];
	
	return [Clear,Draw];
}

async function GetRenderCommands()
{
	const Commands = [];
	const SdfCommands = await UpdateSdf();
	Commands.push( ...SdfCommands );
	
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

async function RenderThread()
{
	const RenderView = new Gui.RenderView(null,'Logo');
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
	
	function OnParamsChanged(NewParams)
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
