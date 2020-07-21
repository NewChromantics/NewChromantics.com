Pop.Include = function(Filename)
{
	let Source = Pop.LoadFileAsString(Filename);
	return Pop.CompileAndRun( Source, Filename );
}

//	auto setup global
function SetGlobal()
{
	Pop.Global = this;
	Pop.Debug(Pop.Global);
}
SetGlobal.call(this);


const LogoParticleShader = RegisterShaderAssetFilename('Logo/LogoParticle.frag.glsl','Logo/LogoParticle.vert.glsl');
const LogoSdfShader = RegisterShaderAssetFilename('Logo/LogoSdf.frag.glsl','Logo/Quad.vert.glsl');
const BlitTextureShader = RegisterShaderAssetFilename('Logo/Blit.frag.glsl','Logo/Quad.vert.glsl');

//	kick off loading
Pop.LoadFileAsStringAsync('Logo/LogoParticle.frag.glsl');
Pop.LoadFileAsStringAsync('Logo/LogoParticle.vert.glsl');
Pop.LoadFileAsStringAsync('Logo/Logo.svg');
Pop.LoadFileAsStringAsync('Logo/LogoSdf.frag.glsl');
Pop.LoadFileAsStringAsync('Logo/Blit.frag.glsl');
Pop.LoadFileAsStringAsync('Logo/Quad.vert.glsl');



var Params = {};
function OnParamsChanged()
{
	
}
Params.LocalScale = 10.0;
Params.WorldScale = 1;
Params.ParticleCount = 1000;
Params.DebugParticles = false;
Params.DebugSdf = false;
Params.BackgroundColour = [0,0,0];
Params.SdfMin = 0.3;
Params.SampleDelta = 0.005;
Params.SampleWeightSigma = 2;
Params.DebugSdfSample = false;
Params.AntiAlias = 0.05;

const ParamsWindowRect = [0,0,350,200];
var ParamsWindow = new CreateParamsWindow(Params,OnParamsChanged,ParamsWindowRect);
ParamsWindow.AddParam('AntiAlias',0,0.1);
ParamsWindow.AddParam('LocalScale',0,50.0);
ParamsWindow.AddParam('WorldScale',0,20.0);
ParamsWindow.AddParam('DebugParticles');
ParamsWindow.AddParam('DebugSdf');
ParamsWindow.AddParam('DebugSdfSample');
ParamsWindow.AddParam('BackgroundColour','Colour');
ParamsWindow.AddParam('SdfMin',0,1);
ParamsWindow.AddParam('SampleDelta',0,1);
ParamsWindow.AddParam('SampleWeightSigma',0,5,Math.floor);


const Rect = [400,800,100,100];
const RenderTimelineWindow = new Pop.Gui.RenderTimelineWindow("Render Stats",Rect);

const LogoSdf = new Pop.Image( [256,256], 'Float4' );
const SdfWindow = new Pop.Gui.Window('Sdf',[0,300,500,500]);
const SdfPreview = new Pop.Gui.ImageMap(SdfWindow,[0,0,'100%','100%']);


AssetFetchFunctions['LogoParticleGeo'] = CreateLogoParticleGeo;
AssetFetchFunctions['LogoParticlePositions'] = CreateLogoParticlePositionTexture;
AssetFetchFunctions['Quad'] = CreateQuadGeometry;



const RandomNumberCache = [];

function GetRandomNumberArray(Count)
{
	if ( RandomNumberCache.length < Count )
		Pop.Debug("calculating random numbers x"+Count);
	while ( RandomNumberCache.length < Count )
	{
		RandomNumberCache.push( Math.random() );
	}
	return RandomNumberCache;
}


function CreateRandomSphereImage(Width,Height)
{
	let Channels = 4;
	let Format = 'Float4';
	
	const TimerStart = Pop.GetTimeNowMs();
	
	let Pixels = new Float32Array( Width * Height * Channels );
	const Rands = GetRandomNumberArray(Pixels.length*Channels);
	for ( let i=0;	i<Pixels.length;	i+=Channels )
	{
		let xyz = Rands.slice( i*Channels, (i*Channels)+Channels );
		let w = xyz[3];
		xyz = Math.Subtract3( xyz, [0.5,0.5,0.5] );
		xyz = Math.Normalise3( xyz );
		xyz = Math.Add3( xyz, [1,1,1] );
		xyz = Math.Multiply3( xyz, [0.5,0.5,0.5] );
		
		Pixels[i+0] = xyz[0];
		Pixels[i+1] = xyz[1];
		Pixels[i+2] = xyz[2];
		Pixels[i+3] = w;
	}
	
	Pop.Debug("CreateRandomSphereImage() took", Pop.GetTimeNowMs() - TimerStart);
	
	let Texture = new Pop.Image();
	Texture.WritePixels( Width, Height, Pixels, Format );
	return Texture;
}


function LoadLogoParticles(RenderTarget)
{
	const Positions = [];
	function PushVertex(x,y,z,Radius)
	{
		Positions.push( x );
		Positions.push( y );
		Positions.push( z );
		Positions.push( Radius );
	}
	
	const GeoFilename = 'Logo/Logo.svg.json';
	const GeoContents = Pop.LoadFileAsString( GeoFilename );
	Pop.Svg.Parse( GeoContents, PushVertex );
	
	const Attributes = {};
	const PositionAttribute = {};
	PositionAttribute.Size = 4;
	PositionAttribute.Data = new Float32Array( Positions );
	Attributes['PositionRadius'] = PositionAttribute;
	
	const TriangleIndexes = undefined;
	const TriangleBuffer = new Pop.Opengl.TriangleBuffer( RenderTarget, Attributes, TriangleIndexes );
	return TriangleBuffer;
}


function CreateLogoParticleGeo(RenderTarget)
{
	//	x = vertex index
	//	y = triangle index
	const VertexData = [];
	function PushTriangle(TriangleIndex)
	{
		VertexData.push( ...[0, TriangleIndex] );
		VertexData.push( ...[1, TriangleIndex] );
		VertexData.push( ...[2, TriangleIndex] );
	}
	for ( let i=0;	i<Params.ParticleCount;	i++ )
		PushTriangle( i );
	
	const Attributes = {};
	const VertexAttribute = {};
	VertexAttribute.Size = 2;
	VertexAttribute.Data = new Float32Array( VertexData );
	Attributes['VertexIndexTriangleIndex'] = VertexAttribute;
	
	const TriangleIndexes = undefined;
	const TriangleBuffer = new Pop.Opengl.TriangleBuffer( RenderTarget, Attributes, TriangleIndexes );
	return TriangleBuffer;
}


function CreateQuadGeometry(RenderTarget)
{
	let VertexData = [];
	
	let AddTriangle = function(a,b,c)
	{
		VertexData.push( ...a );
		VertexData.push( ...b );
		VertexData.push( ...c );
	}
	
	const tln = [0,0];
	const trn = [1,0];
	const brn = [1,1];
	const bln = [0,1];
	
	AddTriangle( tln, trn, brn );
	AddTriangle( brn, bln, tln );
	
	const Attributes = {};
	
	const UvAttrib = {};
	UvAttrib.Size = 2;
	UvAttrib.Data = VertexData;
	Attributes['TexCoord'] = UvAttrib;
	
	const TriangleBuffer = new Pop.Opengl.TriangleBuffer( RenderTarget, Attributes );
	return TriangleBuffer;
}


function CreateLogoParticlePositionTexture(RenderTarget)
{
	const Positions = [];
	let Bounds = null;
	let Min = null;
	let Max = null;
	function OnShape(Shape)
	{
		if ( !Shape.Circle )
		{
			Pop.Warning(`Expected circle shape; ${JSON.stringify(Shape)} skipping`);
			return;
		}
		Positions.push( [Shape.Circle.x,Shape.Circle.y,Shape.Circle.Radius] );
	}

	function FixPosition(xy,SvgBounds)
	{
		Bounds = SvgBounds;
		if ( Min === null )	Min = xy.slice();
		if ( Max === null )	Max = xy.slice();
		Min[0] = Math.min(xy[0],Min[0]);
		Min[1] = Math.min(xy[1],Min[1]);
		Max[0] = Math.max(xy[0],Max[0]);
		Max[1] = Math.max(xy[1],Max[1]);
		return xy;
	}
	
	const SvgFilename = 'Logo/Logo.svg';
	const SvgContents = Pop.LoadFileAsString( SvgFilename );
	Pop.Svg.ParseShapes(SvgContents,OnShape,FixPosition);

	//Params.WorldScale = Bounds[2] / Bounds[3];
	ParamsWindow.OnParamChanged('WorldScale');
	Params.ParticleCount = Positions.length;

	//	turn points into image
	const Width = 1024;
	const Height = Math.GetNextPowerOf2( Positions.length / Width );
	const Channels = 3;
	const Pixels = new Float32Array( Width * Height * Channels );
	function PushPixel(xyr,Index)
	{
		const p = Index * Channels;
		Pixels[p+0] = xyr[0];
		Pixels[p+1] = xyr[1];
		Pixels[p+2] = xyr[2];
	}
	Positions.forEach( PushPixel );
	
	const Format = 'Float' + Channels;
	const Image = new Pop.Image('LogoPositions');
	Image.WritePixels( Width, Height, Pixels, Format );
	return Image;
}



function RenderSdf(RenderTarget,AspectRect)
{
	RenderTarget.ClearColour( 0,0,0 );
	
	const Shader = GetAsset(LogoParticleShader,RenderTarget);
	const WorldPositions = GetAsset('LogoParticlePositions',RenderTarget);
	const Geo = GetAsset('LogoParticleGeo',RenderTarget);
	const LocalPositions = [	-1,-1,0,	1,-1,0,	0,1,0	];
	const RenderTargetRect = RenderTarget.GetRenderTargetRect();
	const AspectRatio = AspectRect[3] / AspectRect[2];

	const SetUniforms = function(Shader)
	{
		Shader.SetUniform('LocalPositions',LocalPositions);
		Shader.SetUniform('WorldPositions',WorldPositions);
		Shader.SetUniform('WorldPositionsWidth',WorldPositions.GetWidth());
		Shader.SetUniform('WorldPositionsHeight',WorldPositions.GetHeight());
		Shader.SetUniform('ProjectionAspectRatio',AspectRatio);
		
		function SetUniform(Key)
		{
			Shader.SetUniform( Key, Params[Key] );
		}
		Object.keys(Params).forEach(SetUniform);
	}
	
	RenderTarget.SetBlendModeMax();
	if ( Params.DebugParticles )
		RenderTarget.SetBlendModeBlit();
	RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
}


function Render(RenderTarget)
{
	RenderTarget.ClearColour( 1,1,0 );
	
	const ScreenRect = RenderTarget.GetScreenRect();
	function CallRenderSdf(RenderTarget)
	{
		RenderSdf( RenderTarget, ScreenRect );
	}
	
	//	update sdf
	const ReadBack = true;
	RenderTarget.RenderToRenderTarget( LogoSdf, CallRenderSdf, ReadBack );
	if ( !SdfWindow.IsMinimised() )
		SdfPreview.SetImage(LogoSdf);
	
	//	turn sdf into image
	RenderTarget.ClearColour( 0,1,0 );

	const Shader = GetAsset( Params.DebugSdf ? BlitTextureShader : LogoSdfShader, RenderTarget);
	const Geo = GetAsset('Quad',RenderTarget);
	const RenderTargetRect = RenderTarget.GetRenderTargetRect();
	const AspectRatio = RenderTargetRect[3] / RenderTargetRect[2];
	
	const SetUniforms = function(Shader)
	{
		Shader.SetUniform('Texture',LogoSdf);
		Shader.SetUniform('ProjectionAspectRatio',AspectRatio);
		
		function SetUniform(Key)
		{
			Shader.SetUniform( Key, Params[Key] );
		}
		Object.keys(Params).forEach(SetUniform);
	}

	RenderTarget.SetBlendModeBlit();
	RenderTarget.ClearColour( ...Params.BackgroundColour );

	RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );

}


//	window now shared from bootup
const Window = new Pop.Opengl.Window("Lunar");

const FpsCounter = new Pop.FrameCounter("fps");

Window.OnRender = function(RenderTarget)
{
	try
	{
		Render(RenderTarget);
		FpsCounter.Add();
	}
	catch(e)
	{
		console.warn(e);
	}
}

