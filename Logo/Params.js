const Params = {};
export default Params;

Params.ParticleRadiusk = 180;
Params.LocalScalek = 900;
Params.WorldScalek = 3030;
Params.DebugSdf = true;
Params.DebugSdfSample = false;


Params.RepelPosition = [0.0,0.0];
Params.RepelRadiusk = 0.07 * 1000;
Params.RepelForceMink = 0.60 * 1000;
Params.RepelForceMaxk = 1.00 * 1000;
Params.ForceNoiseMink = 0.30 * 1000;
Params.ForceNoiseMaxk = 1.00 * 1000;
Params.GravityForcePowerk = 0.12 * 1000;
Params.DragForcePowerk = 0.40 * 1000;
Params.SpringForcePowerk = 0.5 * 1000;

Params.LiquidDensityk = 0.5*1000;
Params.SpecularColour = [255, 255, 255].map( x=>x/255);
Params.FresnelColour = [210, 242, 252].map( x=>x/255);
Params.BackgroundRepeat = 10;
Params.RefractionIncidenceFactorialised = true;
Params.RefractionIncidencek = 1.05*1000;
Params.FresnelFactork = 6.1 * 1000;
Params.LightX = -5.2 * 100;
Params.LightY = 7.8 * 100;
Params.LightZ = 6.5 * 100;
Params.SdfParticleDistancePow = 1*10;
Params.RenderParticleDistancePow = 5*10;
Params.SpecularMinDotk = 900;
Params.BlurSigmak = 5*1000;
Params.SampleWeightSigma = 1;
Params.NormalSampleStepk = 1;
Params.SdfMinRadiusk = 37;
Params.SdfMaxRadiusk = 906;
Params.SdfClipRadiusk = 532;

Params.DebugPhysics = false;
Params.BackgroundColourA = [252, 186, 3].map( x=>x/255);
Params.BackgroundColourB = [222, 130, 18].map( x=>x/255);

//Object.assign( Params, Pop.GetExeArguments() );

export const ParamsMeta = {};

ParamsMeta.RepelRadiusk = {min:0,max:1000};
ParamsMeta.RepelForceMink = {min:0,max:1000};
ParamsMeta.RepelForceMaxk = {min:0,max:1000};
ParamsMeta.ForceNoiseMink = {min:0,max:1000};
ParamsMeta.ForceNoiseMaxk = {min:0,max:1000};
ParamsMeta.GravityForcePowerk = {min:0,max:1000};
ParamsMeta.DragForcePowerk = {min:0,max:1000};
ParamsMeta.SpringForcePowerk = {min:0,max:90*1000};
ParamsMeta.LiquidDensityk = {min:0,max:1000};
ParamsMeta.FresnelFactork = {min:0,max:10*1000};
ParamsMeta.RefractionIncidencek = {min:0,max:3000};
ParamsMeta.BackgroundRepeat = {min:1,max:1000};
ParamsMeta.LightX = {min:-900,max:900};
ParamsMeta.LightY = {min:-900,max:900};
ParamsMeta.LightZ = {min:-900,max:900};
ParamsMeta.SdfParticleDistancePow = {min:1,max:100};
ParamsMeta.RenderParticleDistancePow = {min:1,max:100};
ParamsMeta.SpecularMinDotk = {min:0,max:1*1000};
ParamsMeta.BlurSigmak = {min:1,max:12*1000};
ParamsMeta.SampleWeightSigma = {min:0,max:5};
ParamsMeta.NormalSampleStepk = {min:0,max:10};
ParamsMeta.SdfMinRadiusk = {min:0,max:1000};
ParamsMeta.SdfMaxRadiusk = {min:0,max:1000};
ParamsMeta.SdfClipRadiusk = {min:0,max:1000};
ParamsMeta.ParticleRadiusk = {min:0,max:1000};
ParamsMeta.LocalScalek = {min:0,max:1000};
ParamsMeta.WorldScalek = {min:0,max:1000};


