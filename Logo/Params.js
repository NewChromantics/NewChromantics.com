const Params = {};
export default Params;

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
Params.ParticleRadius = 180;
Params.LocalScale = 900;
Params.WorldScale = 3030;

Params.DebugSdf = false;
Params.DebugSdfSample = false;
Params.BackgroundColourA = [252, 186, 3].map( x=>x/255);
Params.BackgroundColourB = [222, 130, 18].map( x=>x/255);

//Object.assign( Params, Pop.GetExeArguments() );

export const ParamsMeta = {};


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


