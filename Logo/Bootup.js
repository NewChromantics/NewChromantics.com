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
function OnParamsChanged(Params,ParamChanged)
{
	switch(ParamChanged)
	{
		case 'ParticleDuplicate':
		case 'DuplicateOffsetScale':
			//	remake particles
			InvalidateParticlesAsset();
			break;
	}
}

Params.Debug = false;
Params.FinalColourA = [0,1,1];
Params.FinalColourB = [1,0,1];
Params.VelocityColourRangeMin = 0;
Params.VelocityColourRangeMax = 0.4;
Params.LocalScale = 8.0;
Params.WorldScale = 1;
Params.ParticleCount = 1000;
Params.DebugParticles = false;
Params.DebugSdf = false;
Params.BackgroundColour = [0,0,0];
Params.SdfMin = 0.30;
Params.SampleDelta = 0.005;
Params.SampleWeightSigma = 3;
Params.DebugSdfSample = false;
Params.AntiAlias = 0.05;
Params.SpringForce = 0.8;
Params.GravityForce = 0.0;
Params.Damping = 0.5;
Params.NoiseForce = 0.2;
Params.PushRadius = 0.10;
Params.PushForce = 35.0;
Params.PushForceMax = 40.0;
Params.PushForceAgeMax = 18;	//	gr: really low value causes a wierd ripple
Params.ParticleDuplicate = 1;
Params.DuplicateOffsetScale = 0.04;
Params.ParticleVertexScale = 0.65;	//	vertex scale to reduce overdraw
Params.VelocityAccumulatorScalar = 0.1;
Params.VelocityBlurSigma = 10;
Params.UseAccumulatedVelocity = false;
Params.UpdateOrigRectWithScreen = true;	//	let people turn this off to play :)
Params.OrigRectX = 0;
Params.OrigRectY = 0;
Params.OrigRectW = 1;
Params.OrigRectH = 1;

Object.assign( Params, Pop.GetExeArguments() );

const ParamsWindowRect = [400,600,350,200];
const ParamsWindowType = Params.Debug ? Pop.ParamsWindow : Pop.DummyParamsWindow;
const ParamsWindow = new ParamsWindowType(Params,OnParamsChanged,ParamsWindowRect);
//ParamsWindow.SetMinimised(!Params.Debug);

ParamsWindow.AddParam('OrigRectX',0,1);
ParamsWindow.AddParam('OrigRectY',0,1);
ParamsWindow.AddParam('OrigRectW',0,1);
ParamsWindow.AddParam('OrigRectH',0,1);
ParamsWindow.AddParam('UpdateOrigRectWithScreen');

ParamsWindow.AddParam('BackgroundColour','Colour');
ParamsWindow.AddParam('FinalColourA','Colour');
ParamsWindow.AddParam('FinalColourB','Colour');
ParamsWindow.AddParam('VelocityColourRangeMin',0,1);
ParamsWindow.AddParam('VelocityColourRangeMax',0,1);
ParamsWindow.AddParam('VelocityBlurSigma',0,50);
ParamsWindow.AddParam('UseAccumulatedVelocity');
ParamsWindow.AddParam('VelocityAccumulatorScalar',0,1);
ParamsWindow.AddParam('AntiAlias',0,0.1);
ParamsWindow.AddParam('ParticleVertexScale',0.001,1.5);
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
ParamsWindow.AddParam('PushForceAgeMax',0,20);
ParamsWindow.AddParam('PushRadius',0,0.5);
ParamsWindow.AddParam('DuplicateOffsetScale',0,1);
ParamsWindow.AddParam('ParticleDuplicate',0,3,Math.floor);


let RenderTimelineWindow;
if ( Params.Debug )
{
	const Rect = [500,500,100,100];
	RenderTimelineWindow = new Pop.Gui.RenderTimelineWindow("Render Stats",Rect);
}

let SdfWindow;
if ( Params.Debug )
{
	SdfWindow = new Pop.Gui.Window('Sdf',[0,300,300,300]);
	const SdfPreview = new Pop.Gui.ImageMap(SdfWindow,[0,0,'100%','100%']);
	SdfWindow.SetMinimised();
}

//	texture we draw SD positions to
const HiRes = true;
const ResScale = HiRes ? 3 : 1;
const PositionsSdf = new Pop.Image( [ResScale*1024,ResScale*1024], 'RGBA' );
PositionsSdf.SetLinearFilter(true);

let PhysicsTextures = null;	//PhysicsTexturesManager

AssetFetchFunctions['LogoParticleGeo'] = CreateLogoParticleGeo;
AssetFetchFunctions['LogoParticlePositions'] = CreateLogoParticlePositionTexture;
AssetFetchFunctions['Quad'] = CreateQuadGeometry;



function InvalidateParticlesAsset()
{
	PhysicsTextures = null;
	InvalidateAsset('LogoParticleGeo');
	InvalidateAsset('LogoParticlePositions');
}


//	current positions, double buffered
class PhysicsTexturesManager
{
	constructor(OriginalPositions,GetOriginalPositionRect,EnableDebugWindow)
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
		this.GetOriginalPositionRect = GetOriginalPositionRect;
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
		this.PushPositions.push( [u,v,this.Time] );
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
		return this.BufferA ? this.VelocitysA : this.VelocitysB;
	}
	
	Iteration(RenderContext)
	{
		const OldVel = this.BufferA ? this.VelocitysA : this.VelocitysB;
		const NewVel = this.BufferA ? this.VelocitysB : this.VelocitysA;
		const OldPos = this.BufferA ? this.PositionsA : this.PositionsB;
		const NewPos = this.BufferA ? this.PositionsB : this.PositionsA;

		const TimeStep = 1/60;
		this.Time += TimeStep;
		
		try
		{
			//	update velocities from current buffer to back buffer
			this.UpdateVelocitys( RenderContext, OldVel, NewVel, OldPos, this.OriginalPositions, TimeStep );

			//	update positions from current buffer to back buffer
			this.UpdatePositions( RenderContext, OldPos, NewPos, NewVel, TimeStep );
		}
		catch(e)
		{
			Pop.Warning(e);
		}
		
		//	move back buffer to front
		this.BufferA = !this.BufferA;
	}
	
	UpdateVelocitys(RenderContext,OldVelocitys,NewVelocitys,Positions,OriginalPositions,TimeStep)
	{
		const Time = this.Time;
		const PushPositions = this.PushPositions;

		//	to aid resizing and different layouts
		//	instead of scaling, we change the rect where original positions
		//	should be, so resizing will move particles into place
		const OrigPositionsRect = this.GetOriginalPositionRect();
		

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
				Shader.SetUniform('OrigPositionsRect',OrigPositionsRect);
				Shader.SetUniform('LastPositions',Positions);
				Shader.SetUniform('Noise',Noise);
				Shader.SetUniform('PhysicsStep',TimeStep);
				Shader.SetUniform('Time', Time);
				Shader.SetUniform('PushPositions', PushPositions );
				Shader.SetUniform('VertexRect',[0,0,1,1]);
				
				function SetUniform(Key)
				{
					Shader.SetUniform( Key, Params[Key] );
				}
				Object.keys(Params).forEach(SetUniform);
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
				Shader.SetUniform('VertexRect',[0,0,1,1]);
				
				function SetUniform(Key)
				{
					Shader.SetUniform( Key, Params[Key] );
				}
				Object.keys(Params).forEach(SetUniform);
			}
			RenderTarget.ClearColour( 0,0,0 );
			RenderTarget.SetBlendModeBlit();
			RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
		}
		RenderContext.RenderToRenderTarget( NewPositions, Render );
	}
}


function GetOriginalPositionRect()
{
	const x = Params.OrigRectX;
	const y = Params.OrigRectY;
	const w = Params.OrigRectW;
	const h = Params.OrigRectH;
	return [x,y,w,h];
}

//	return Rect, but shrunk/grown to center in ParentRect maintaining aspect
function FitRectMaintainingAspect(Rect,ParentRect)
{
	//	dont modify original
	Rect = Rect.slice();
	
	//	scale so width fits
	const WidthScale = ParentRect[2] / Rect[2];
	Rect[0] *= WidthScale;
	Rect[1] *= WidthScale;
	Rect[2] *= WidthScale;
	Rect[3] *= WidthScale;

	//	now if the height doesn't fit, scale down
	if ( Rect[3] > ParentRect[3] )
	{
		const HeightScale = ParentRect[3] / Rect[3];
		Rect[0] *= HeightScale;
		Rect[1] *= HeightScale;
		Rect[2] *= HeightScale;
		Rect[3] *= HeightScale;
	}
	
	//	now center
	//	gr: maybe should have other rules like, "stay in place where possible" ?
	Rect[0] = (ParentRect[2] - Rect[2]) / 2;
	Rect[1] = (ParentRect[3] - Rect[3]) / 2;

	return Rect;
}

function UpdateOriginalPositionRect(ScreenRect)
{
	if ( !Params.UpdateOrigRectWithScreen )
		return;
	
	//	the ideal box tells us where our SVG space should occupy (260x100)
	//	we need to then get the UV space rect of that in the box of the canvas
	//	(which should be screen rect)
	let SvgRect = [0,0,260/260,100/260];
	
	const DomRect = ScreenRect;
	const CanvasRect = ScreenRect;
	
	//	fit svg rect into the ideal-space rect
	SvgRect = FitRectMaintainingAspect(SvgRect,DomRect);
	
	//	now we force it to be 1:1 so height overflows (but the ideal part is the same)
	SvgRect[3] = SvgRect[2];

	//	now we want that rect normalised in the canvas rect
	let OrigRect = GetNormalisedRect( SvgRect, CanvasRect );
	
	Params.OrigRectX = OrigRect[0];
	Params.OrigRectY = OrigRect[1];
	Params.OrigRectW = OrigRect[2];
	Params.OrigRectH = OrigRect[3];
	
	ParamsWindow.OnParamChanged('OrigRectX');
	ParamsWindow.OnParamChanged('OrigRectY');
	ParamsWindow.OnParamChanged('OrigRectW');
	ParamsWindow.OnParamChanged('OrigRectH');
}

function GetPositionsTexture(RenderContext)
{
	const EnableDebugWindow = Pop.GetExeArguments().ShowPhysicsTextures;
	
	//const WorldPositions = GetAsset('LogoParticlePositions',RenderContext);
	//return WorldPositions;
	
	//	init textures
	if ( !PhysicsTextures )
	{
		const OriginalPositions = GetAsset('LogoParticlePositions',RenderContext);
		PhysicsTextures = new PhysicsTexturesManager(OriginalPositions,GetOriginalPositionRect,EnableDebugWindow);
		
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
	
	//	add more!
	function MakeDuplicate(xyr)
	{
		const Texel = Params.DuplicateOffsetScale * 0.1;
		xyr = xyr.slice();
		xyr[0] += (Math.random()-0.5) * Texel;
		xyr[1] += (Math.random()-0.5) * Texel;
		return xyr;
	}
	for ( let i=0;	i<=Params.ParticleDuplicate;	i++ )
	{
		const NewPositions = Positions.map( MakeDuplicate );
		Positions.push( ...NewPositions );
	}
	
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
	
	Params.ParticleCount = Positions.length;
	//ParamsWindow.OnParamChanged('ParticleCount');
	
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





function RenderSdf(RenderTarget)
{
	//	gr: asset fetching should be context
	//const RenderContext = RenderTarget.GetRenderContext();
	const RenderContext = RenderTarget;
	
	const Shader = GetAsset(LogoParticleShader,RenderContext);
	const WorldPositions = GetPositionsTexture(RenderContext);
	const Velocitys = GetVelocitysTexture(RenderContext);
	const Geo = GetAsset('LogoParticleGeo',RenderContext);
	const LocalPositions = [	-1,-1,0,	1,-1,0,	0,1,0	];
	const RenderTargetRect = RenderTarget.GetRenderTargetRect();
	const AspectRatio = 1;//AspectRect[3] / AspectRect[2];

	const SetUniforms = function(Shader)
	{
		Shader.SetUniform('LocalPositions',LocalPositions);
		Shader.SetUniform('WorldPositions',WorldPositions);
		Shader.SetUniform('Velocitys',Velocitys);
		Shader.SetUniform('WorldPositionsWidth',WorldPositions.GetWidth());
		Shader.SetUniform('WorldPositionsHeight',WorldPositions.GetHeight());
		Shader.SetUniform('ProjectionAspectRatio',AspectRatio);
		Shader.SetUniform('VertexRect',[0,0,1,1]);
		
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
	UpdateOriginalPositionRect(RenderTarget.GetScreenRect());
	
	//	update physics
	PhysicsIteration(RenderTarget);
	
	
	//	render a new sdf
	const ScreenRect = RenderTarget.GetRenderTargetRect();
	function CallRenderSdf(RenderTarget)
	{
		RenderSdf( RenderTarget, ScreenRect );
	}
	const ReadBack = SdfWindow && !SdfWindow.IsMinimised();
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
		Shader.SetUniform('SdfTexture',PositionsSdf);
		Shader.SetUniform('SdfTextureWidth',PositionsSdf.GetWidth());
		Shader.SetUniform('SdfTextureHeight',PositionsSdf.GetHeight());
		
		Shader.SetUniform('ProjectionAspectRatio',AspectRatio);
		Shader.SetUniform('VertexRect',[0,0,1,1]);
		
		function SetUniform(Key)
		{
			Shader.SetUniform( Key, Params[Key] );
		}
		Object.keys(Params).forEach(SetUniform);
	}

	RenderTarget.ClearColour( ...Params.BackgroundColour );
	RenderTarget.SetBlendModeBlit();
	RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
}


//	window now shared from bootup
const Window = new Pop.Opengl.Window('Logo');

Window.OnRender = Render;

Window.OnMouseMove = function(x,y)
{
	const Args = Array.from(arguments);
	if ( PhysicsTextures )
	{
		const Rect = Window.GetScreenRect();
		const u = x / Rect[2];
		const v = y / Rect[3];
		PhysicsTextures.OnMouseMove(u,v);
	}
}
