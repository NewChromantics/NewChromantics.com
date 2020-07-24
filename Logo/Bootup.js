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
const PositionsToSdfShader = RegisterShaderAssetFilename('Logo/LogoSdf.frag.glsl','Logo/Quad.vert.glsl');
const BlitTextureShader = RegisterShaderAssetFilename('Logo/Blit.frag.glsl','Logo/Quad.vert.glsl');
const UpdatePositionsShader = RegisterShaderAssetFilename('Logo/Logo_PhysicsIteration_UpdatePosition.frag.glsl','Logo/Quad.vert.glsl');
const UpdateVelocitysShader = RegisterShaderAssetFilename('Logo/Logo_PhysicsIteration_UpdateVelocity.frag.glsl','Logo/Quad.vert.glsl');

//	kick off loading
Pop.LoadFileAsStringAsync('Logo/LogoParticle.frag.glsl');
Pop.LoadFileAsStringAsync('Logo/LogoParticle.vert.glsl');
Pop.LoadFileAsStringAsync('Logo/Logo.svg');
Pop.LoadFileAsStringAsync('Logo/LogoSdf.frag.glsl');
Pop.LoadFileAsStringAsync('Logo/Blit.frag.glsl');
Pop.LoadFileAsStringAsync('Logo/Quad.vert.glsl');
Pop.LoadFileAsImageAsync('Logo/Noise.png');
Pop.LoadFileAsStringAsync('Logo/Logo_PhysicsIteration_UpdatePosition.frag.glsl');
Pop.LoadFileAsStringAsync('Logo/Logo_PhysicsIteration_UpdateVelocity.frag.glsl');


var Params = {};
function OnParamsChanged()
{
	
}
Params.LocalScale = 15.0;
Params.WorldScale = 1;
Params.ParticleCount = 9000;
Params.DebugParticles = false;
Params.DebugSdf = false;
Params.BackgroundColour = [0,0,0];
Params.SdfMin = 0.62;
Params.SampleDelta = 0.005;
Params.SampleWeightSigma = 3;
Params.DebugSdfSample = false;
Params.AntiAlias = 0.05;
Params.SpringForce = 5.0;
Params.GravityForce = 0.3;
Params.Damping = 0.22;
Params.NoiseForce = 0.35;
Params.PushRadius = 0.15;
Params.PushForce = 20.00;
Params.PushForceMax = 40.00;


const ParamsWindowRect = [400,600,350,200];
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
ParamsWindow.AddParam('SpringForce',0,10);
ParamsWindow.AddParam('GravityForce',-10,10);
ParamsWindow.AddParam('Damping',0,1);
ParamsWindow.AddParam('NoiseForce',0,10);
ParamsWindow.AddParam('PushForce',0,50);
ParamsWindow.AddParam('PushForceMax',0,50);
ParamsWindow.AddParam('PushRadius',0,0.5);


const Rect = [500,500,100,100];
const RenderTimelineWindow = new Pop.Gui.RenderTimelineWindow("Render Stats",Rect);

const SdfWindow = new Pop.Gui.Window('Sdf',[0,300,300,300]);
const SdfPreview = new Pop.Gui.ImageMap(SdfWindow,[0,0,'100%','100%']);

//	texture we draw SD positions to
const PositionsSdf = new Pop.Image( [256,256], 'Float4' );

let PhysicsTextures = null;	//PhysicsTexturesManager

AssetFetchFunctions['LogoParticleGeo'] = CreateLogoParticleGeo;
AssetFetchFunctions['LogoParticlePositions'] = CreateLogoParticlePositionTexture;
AssetFetchFunctions['Quad'] = CreateQuadGeometry;




//	current positions, double buffered
class PhysicsTexturesManager
{
	constructor(OriginalPositions,EnableDebugWindow)
	{
		//	back buffer flipper
		//	a=true means A = current
		this.BufferA = true;
		
		//	copy originals
		this.PositionsA = this.CreatePositionTexture(OriginalPositions);
		this.PositionsB = this.CreatePositionTexture(OriginalPositions);

		//	init velocitys
		this.VelocitysA = this.CreateVelocityTexture(OriginalPositions);
		this.VelocitysB = this.CreateVelocityTexture(OriginalPositions);
		
		this.Time = 0;
		this.OriginalPositions = OriginalPositions;
		this.PushPositions = [];
		
		if ( EnableDebugWindow )
		{
			try
			{
				this.DebugWindow = new Pop.Gui.Window('PhysicsTextures',[0,0,400,400]);
				this.DebugPositionsA = new Pop.Gui.ImageMap(this.DebugWindow,[0,0,'50%','50%']);
				this.DebugPositionsB = new Pop.Gui.ImageMap(this.DebugWindow,['50%',0,'50%','50%']);
				this.DebugVelocitysA = new Pop.Gui.ImageMap(this.DebugWindow,[0,'50%','50%','50%']);
				this.DebugVelocitysB = new Pop.Gui.ImageMap(this.DebugWindow,['50%','50%','50%','50%']);
			
				this.DebugPositionsA.SetImage(this.PositionsA);
				this.DebugPositionsB.SetImage(this.PositionsB);
				this.DebugVelocitysA.SetImage(this.VelocitysA);
				this.DebugVelocitysB.SetImage(this.VelocitysB);
			}
			catch(e)
			{
				Pop.Warning(e);
			}
		}
	}
	
	OnMouseMove(u,v)
	{
		const PushPositionCount = 4;
		this.PushPositions.push( [u,v] );
		this.PushPositions = this.PushPositions.slice(-PushPositionCount);
	}
	
	CreateVelocityTexture(OriginalPositions)
	{
		//	todo: rgba for non-float targets
		const w = OriginalPositions.GetWidth();
		const h = OriginalPositions.GetHeight();
		const Pixels = new Float32Array(w*h*4);
		const Image = new Pop.Image('Velocity');
		Image.WritePixels( w, h, Pixels, 'Float4' );
		return Image;
	}
	
	CreatePositionTexture(OriginalPositions)
	{
		const Image = new Pop.Image('PhysicsPositions');
		Image.Copy(OriginalPositions);
		return Image;
	}
	
	GetPositions()
	{
		return this.BufferA ? this.PositionsA : this.PositionsB;
	}

	GetVelocitys()
	{
		return this.BufferA ? this.PositionsA : this.PositionsB;
	}
	
	Iteration(RenderContext)
	{
		const OldVel = this.BufferA ? this.VelocitysA : this.VelocitysB;
		const NewVel = this.BufferA ? this.VelocitysB : this.VelocitysA;
		const OldPos = this.BufferA ? this.PositionsA : this.PositionsB;
		const NewPos = this.BufferA ? this.PositionsB : this.PositionsA;

		const TimeStep = 1/60;
		this.Time += TimeStep;
		
		//	update velocities from current buffer to back buffer
		this.UpdateVelocitys( RenderContext, OldVel, NewVel, OldPos, this.OriginalPositions, TimeStep, this.Time );

		//	update positions from current buffer to back buffer
		this.UpdatePositions( RenderContext, OldPos, NewPos, NewVel, TimeStep, this.Time );

		//	move back buffer to front
		this.BufferA = !this.BufferA;
	}
	
	UpdateVelocitys(RenderContext,OldVelocitys,NewVelocitys,Positions,OriginalPositions,TimeStep,Time)
	{
		const PushPositions = this.PushPositions;
		
		function Render(RenderTarget)
		{
			const RenderContext = RenderTarget;
			const Shader = GetAsset(UpdateVelocitysShader,RenderContext);
			const Geo = GetAsset('Quad',RenderContext);
			const Noise = Pop.LoadFileAsImage('Logo/Noise.png');
			
			function SetUniforms(Shader)
			{
				Shader.SetUniform('LastVelocitys',OldVelocitys);
				Shader.SetUniform('OrigPositions',OriginalPositions);
				Shader.SetUniform('LastPositions',Positions);
				Shader.SetUniform('Noise',Noise);
				Shader.SetUniform('PhysicsStep',TimeStep);
				Shader.SetUniform('Time', Time);
				Shader.SetUniform('PushPositions', PushPositions );
				
				for ( let [Key,Value] of Object.entries(Params) )
				{
					Shader.SetUniform(Key,Value);
				}
			}
			RenderTarget.ClearColour( 0,0,0 );
			RenderTarget.SetBlendModeBlit();
			RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
		}
		RenderContext.RenderToRenderTarget( NewVelocitys, Render );
	}
	
	UpdatePositions(RenderContext,OldPositions,NewPositions,NewVelocitys,TimeStep,Time)
	{
		function Render(RenderTarget)
		{
			const RenderContext = RenderTarget;
			const Shader = GetAsset(UpdatePositionsShader,RenderContext);
			const Geo = GetAsset('Quad',RenderContext);
			
			function SetUniforms(Shader)
			{
				Shader.SetUniform('LastPositions',OldPositions);
				Shader.SetUniform('Velocitys',NewVelocitys);
				Shader.SetUniform('PhysicsStep',TimeStep);
				Shader.SetUniform('Time',Time);
			}
			RenderTarget.ClearColour( 0,0,0 );
			RenderTarget.SetBlendModeBlit();
			RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
		}
		RenderContext.RenderToRenderTarget( NewPositions, Render );
	}
}


function GetPositionsTexture(RenderContext)
{
	//const EnableDebugWindow = Pop.GetExeArguments().ShowPhysicsTextures;
	const EnableDebugWindow = true;

	//const WorldPositions = GetAsset('LogoParticlePositions',RenderContext);
	//return WorldPositions;
	
	//	init textures
	if ( !PhysicsTextures )
	{
		const OriginalPositions = GetAsset('LogoParticlePositions',RenderContext);
		PhysicsTextures = new PhysicsTexturesManager(OriginalPositions,EnableDebugWindow);
		
		//	do first iteration so things are initialised
		PhysicsTextures.Iteration(RenderContext);
	}

	return PhysicsTextures.GetPositions();
}

function GetVelocitysTexture(RenderContext)
{
	//	make sure everything is initialised
	GetPositionsTexture(RenderContext);
	return PhysicsTextures.GetVelocitys();
}

function PhysicsIteration(RenderContext)
{
	//	dont make here
	if ( !PhysicsTextures )
		return;
	PhysicsTextures.Iteration(RenderContext);
}



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


//	x,y,radius
function GetLogoPositions(SvgFilename)
{
	let Positions = [];
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
	
	const SvgContents = Pop.LoadFileAsString( SvgFilename );
	Pop.Svg.ParseShapes(SvgContents,OnShape,FixPosition);
	
	Pop.Debug(`logo positions bounds ${Bounds}`);
	
	//	correct positions as image is wider than high
	function ResizeXyr(xyr)
	{
		//	gr: argh, but this seems correct
		const Scale = 1;//1 - (Bounds[3] / Bounds[2] / 2);
		xyr[0] *= Scale;
		xyr[1] *= Scale;
		xyr[2] *= Scale;
		return xyr;
	}
	Positions = Positions.map(ResizeXyr);
	
	return Positions;
}

function LoadLogoParticles(RenderTarget)
{
	const Positions = GetLogoPositions('Logo/Logo.svg');
	const Attributes = {};
	const PositionAttribute = {};
	PositionAttribute.Size = 3;
	PositionAttribute.Data = new Float32Array( Positions );
	Attributes['PositionRadius'] = PositionAttribute;
	
	const TriangleIndexes = undefined;
	const TriangleBuffer = new Pop.Opengl.TriangleBuffer( RenderTarget, Attributes, TriangleIndexes );
	return TriangleBuffer;
}


function CreateLogoParticlePositionTexture(RenderTarget)
{
	const Positions = GetLogoPositions('Logo/Logo.svg');
	
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





function RenderSdf(RenderTarget,AspectRect)
{
	//	gr: asset fetching should be context
	//const RenderContext = RenderTarget.GetRenderContext();
	const RenderContext = RenderTarget;
	
	const Shader = GetAsset(LogoParticleShader,RenderContext);
	const WorldPositions = GetPositionsTexture(RenderContext);
	const Geo = GetAsset('LogoParticleGeo',RenderContext);
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
	
	RenderTarget.ClearColour( 0,0,0 );
	RenderTarget.SetBlendModeMax();
	if ( Params.DebugParticles )
		RenderTarget.SetBlendModeBlit();
	RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
}


function Render(RenderTarget)
{
	//	update physics
	PhysicsIteration(RenderTarget);
	
	
	//	render a new sdf
	RenderTarget.ClearColour( 1,1,0 );
	
	const ScreenRect = RenderTarget.GetScreenRect();
	function CallRenderSdf(RenderTarget)
	{
		RenderSdf( RenderTarget, ScreenRect );
	}
	const ReadBack = !SdfWindow.IsMinimised();
	RenderTarget.RenderToRenderTarget( PositionsSdf, CallRenderSdf, ReadBack );
	if ( ReadBack )
		SdfPreview.SetImage(PositionsSdf);
	
	
	
	
	
	//	render sdf as final output image
	const Shader = GetAsset( Params.DebugSdf ? BlitTextureShader : PositionsToSdfShader, RenderTarget);
	const Geo = GetAsset('Quad',RenderTarget);
	const RenderTargetRect = RenderTarget.GetRenderTargetRect();
	const AspectRatio = RenderTargetRect[3] / RenderTargetRect[2];
	
	const SetUniforms = function(Shader)
	{
		Shader.SetUniform('Texture',PositionsSdf);
		Shader.SetUniform('ProjectionAspectRatio',AspectRatio);
		
		function SetUniform(Key)
		{
			Shader.SetUniform( Key, Params[Key] );
		}
		Object.keys(Params).forEach(SetUniform);
	}

	RenderTarget.ClearColour( 0,1,0 );
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
Window.OnMouseMove = function(x,y)
{
	if ( PhysicsTextures )
	{
		const Rect = Window.GetScreenRect();
		const u = x / Rect[2];
		const v = y / Rect[3];
		PhysicsTextures.OnMouseMove(u,v);
	}
}

