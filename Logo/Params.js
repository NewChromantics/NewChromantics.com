const Params = {};
export default Params;

Params.Debug = false;
Params.FinalColourA = [0,1,1];
Params.FinalColourB = [1,0,1];
Params.VelocityColourRangeMin = 0;
Params.VelocityColourRangeMax = 0.4;
Params.ParticleRadius = 100;
Params.LocalScale = 100;
Params.WorldScale = 500;
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

//Object.assign( Params, Pop.GetExeArguments() );

export const ParamsMeta = {};
ParamsMeta.OrigRectX = {min:0,max:1};
ParamsMeta.OrigRectY = {min:0,max:1};
ParamsMeta.OrigRectW = {min:0,max:1};
ParamsMeta.OrigRectH = {min:0,max:1};
ParamsMeta.BackgroundColour = {type:"Colour"};
ParamsMeta.FinalColourA = {type:"Colour"};
ParamsMeta.FinalColourB = {type:"Colour"};
ParamsMeta.VelocityColourRangeMin = {min:0,max:1};
ParamsMeta.VelocityColourRangeMax = {min:0,max:1};
ParamsMeta.VelocityBlurSigma = {min:0,max:50};
ParamsMeta.VelocityAccumulatorScalar = {min:0,max:1};
ParamsMeta.AntiAlias = {min:0,max:0.1};
ParamsMeta.ParticleVertexScale = {min:0.001,max:1.5};

ParamsMeta.ParticleRadius = {min:0,max:1000};
ParamsMeta.LocalScale = {min:0,max:1000};
ParamsMeta.WorldScale = {min:0,max:4000};
ParamsMeta.BackgroundColour = {type:"Colour"};
ParamsMeta.SdfMin = {min:0,max:1};
ParamsMeta.SampleDelta = {min:0,max:1};
ParamsMeta.SampleWeightSigma= {min:0,max:5};
ParamsMeta.SpringForce = {min:0,max:10};
ParamsMeta.GravityForce = {min:-10,max:10};
ParamsMeta.Damping = {min:0,max:1};
ParamsMeta.NoiseForce = {min:0,max:10};
ParamsMeta.PushForce = {min:0,max:50};
ParamsMeta.PushForceMax = {min:0,max:50};
ParamsMeta.PushForceAgeMax = {min:0,max:20};
ParamsMeta.PushRadius = {min:0,max:0.5};
ParamsMeta.DuplicateOffsetScale = {min:0,max:1};
ParamsMeta.ParticleDuplicate = {min:0,max:3};

