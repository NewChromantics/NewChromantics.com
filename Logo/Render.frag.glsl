precision highp float;

uniform sampler2D SdfPointsTexture;
uniform vec2 SdfPointsTextureSize;
varying vec2 FragUv;
uniform vec2 RenderTargetSize;

uniform float SdfMinRadiusk;
uniform float SdfMaxRadiusk;
uniform float SdfClipRadiusk;
#define SdfMinRadius (SdfMinRadiusk/1000.0)
#define SdfMaxRadius (SdfMaxRadiusk/1000.0)
#define SdfClipRadius (SdfClipRadiusk/1000.0)

uniform float NormalSampleStepk;
#define NormalSampleStep	(NormalSampleStepk/1000.0)

float Range(float Min,float Max,float Value)
{
	return (Value-Min)/(Max-Min);
}

const float FloorZ = 0.0;
const float PeakZ = 1.0;

float GetOffsetSample(vec2 uv,vec2 Offset)
{
	uv += Offset;
	//uv.y = 1.0 - uv.y;
	//	distance is w (used in the max blend)
	//	but it seems its not propogating?
	float Sample = texture2D( SdfPointsTexture, uv ).x;
	return Sample;
}


float normpdf(in float x, in float sigma)
{
	return 0.39894*exp(-0.5*x*x/(sigma*sigma))/sigma;
}

//	gr: adapted from https://www.shadertoy.com/view/XdfGDH
vec4 SampleBlurred(sampler2D Texture,vec2 TextureSize,float BlurSigma,in vec2 fragCoord )
{
	//declare stuff
	#define mSize 8	//	11 in https://www.shadertoy.com/view/XdfGDH doesnt work on my 2013 macbook
	#define kSize ( (mSize-1)/2 )
	float kernel[mSize];
	vec4 final_colour = vec4(0,0,0,0);
	
	//create the 1-D kernel
	float sigma = BlurSigma;
	for (int j = 0; j <= kSize; ++j)
	{
		kernel[kSize+j] = kernel[kSize-j] = normpdf(float(j), sigma);
	}
	
	//get the normalization factor (as the gaussian has been clamped)
	float Z = 0.0;
	for (int j = 0; j < mSize; ++j)
	{
		Z += kernel[j];
	}
	
	//read out the texels
	for (int i=-kSize; i <= kSize; ++i)
	{
		for (int j=-kSize; j <= kSize; ++j)
		{
			vec2 uvoffset = vec2(float(i),float(j)) / TextureSize.xy; 
			final_colour += kernel[kSize+j]*kernel[kSize+i] * texture2D(Texture, fragCoord.xy+uvoffset);
		}
	}
	
	
	final_colour = final_colour/(Z*Z);
	return final_colour;
}

uniform float BlurSigmak;
#define BlurSigma	(BlurSigmak/1000.0)
uniform float RenderParticleDistancePow;

float GetDistance(vec2 Uv)
{
	vec4 Sample = SampleBlurred( SdfPointsTexture, SdfPointsTextureSize, BlurSigma, Uv );
	return Sample.x;
	float d = texture2D( SdfPointsTexture, Uv ).x;
	//d -= SdfMaxRadius;
	return d;
}

//	turn sdf value into 3d position
//	w = validity (could be "floor=0" and we cold just use z)
vec4 GetPosition(vec2 ScreenUv,vec2 PxOffset)
{
	//	assume a flat top (UP), so the rim curves down to RIGHT
	vec2 xy = ScreenUv + (PxOffset / SdfPointsTextureSize);
	float Distance = GetDistance(xy);
	
	bool Valid = true;
	
	float z = Range( SdfMinRadius, SdfMaxRadius, Distance );
	//	flatten top, but not completely or we'll get bad normals
	if ( z < 0.0 )	
	{
		//z *= 0.1;
		//z = 0.0;
	}
	if ( z > 1.0 )	
	{
		z = 1.0;
	}
	if ( Distance > SdfClipRadius )
		Valid = false;


	//z=1.0-z;
	z=pow(z,RenderParticleDistancePow/10.0);
	//z=1.0-z;

		
	z = mix( FloorZ, PeakZ, 1.0-z );
	
	return vec4( xy, z, Valid ? 1.0 :0.0 );
	
}
/*
float MapDistance(vec2 Pos)
{
	vec4 Pos4 = GetPosition(Pos);
	return Pos4.z;
}

vec3 calcNormal(vec3 pos)
{
	//float TexelSize = 0.5773;
	float TexelSize = 0.005773;
	vec2 e = vec2(1.0,-1.0)*TexelSize;
	const float eps = 0.0005;
	vec3 Dir = vec3(0,0,0);
	return normalize( e.xyy * MapDistance( pos + e.xyy*eps ) + 
					  e.yyx * MapDistance( pos + e.yyx*eps ) + 
					  e.yxy * MapDistance( pos + e.yxy*eps ) + 
					  e.xxx * MapDistance( pos + e.xxx*eps ) );
}
*/

uniform bool DebugSdfSample;
uniform float SpecularMinDotk;
#define SpecularMinDot	(SpecularMinDotk/1000.0)

uniform float LightX;
uniform float LightY;
uniform float LightZ;

#define LightPos	(vec3(LightX,LightY,LightZ)/vec3(100.0)) 


uniform vec3 BackgroundColourA;
uniform vec3 BackgroundColourB;
uniform float BackgroundChequerRepeat;
uniform float BackgroundRingRepeat;
uniform bool RefractionIncidenceFactorialised;
uniform float RefractionIncidencek;
#define RefractionIncidence	(RefractionIncidenceFactorialised?1.0/(RefractionIncidencek/1000.0):(RefractionIncidencek/1000.0))

uniform float FresnelFactork;
#define FresnelFactor	(FresnelFactork/1000.0)

uniform vec3 SpecularColour;
uniform vec3 FresnelColour;
uniform float LiquidDensityk;
#define LiquidDensity (LiquidDensityk/1000.0)

uniform float TimeSecs;
uniform float BackgroundTimeScalek;
#define BackgroundTimeScale	(BackgroundTimeScalek/1000.0)

uniform float ChromaOffsetk;
#define ChromaOffsetX	(ChromaOffsetk/1000.0)
#define ChromaOffsetY	(ChromaOffsetk/1000.0)
#define RedOffsetX	(-ChromaOffsetX)
#define RedOffsetY	(-ChromaOffsetY)
#define BlueOffsetX	(ChromaOffsetX)
#define BlueOffsetY	(ChromaOffsetY)


vec3 GetBackgroundColour(vec2 Uv)
{
	Uv -= vec2(0.5);

	vec2 Chequer = Uv * vec2(BackgroundChequerRepeat);
	Chequer = fract(Chequer);
	bool a = Chequer.x < 0.5;
	bool b = Chequer.y < 0.5;
	bool AltColour = a==b;
	/*
	if ( AltColour )
		return BackgroundColourA;
	else
		return BackgroundColourB;
	*/
	
	//	radial
	float Time = length(Uv) * (BackgroundRingRepeat/10.0);
	Time -= TimeSecs*BackgroundTimeScale;
	Time = fract(Time);
	bool t = Time < 0.5;
	if ( t == AltColour )
		return BackgroundColourA;
	else
		return BackgroundColourB;
	
}

float GetFresnel(vec3 eyeVector, vec3 worldNormal)
{
	return pow( 1.0 + dot( eyeVector, worldNormal), FresnelFactor );
}


void Trace(vec2 ScreenUv,vec2 ScreenOffsetUv,out vec2 BackgroundUv,out float Specular)
{
	BackgroundUv = ScreenUv;
	vec4 Pos = GetPosition(ScreenUv,vec2(0));
	if ( Pos.w <= 0.0 )
	{
		Specular = 0.0;
		
		return;
	}
	
	//	only apply chromatic offset for reflections & refractions
	//	via normal
	vec2 NormalSampleUv = ScreenUv + ScreenOffsetUv;
	
	//	calcnormal
	vec3 v0 = GetPosition( NormalSampleUv, vec2(-1,-1) ).xyz;
	vec3 v1 = GetPosition( NormalSampleUv, vec2(1,-1) ).xyz;
	vec3 v2 = GetPosition( NormalSampleUv, vec2(0.0,1) ).xyz;
	vec3 Normal = normalize(cross(v1-v0, v2-v0));
	if ( v0.z == v1.z && v1.z == v2.z )
		Normal = vec3(0,0,1);

	vec3 DirToLight = normalize(LightPos - Pos.xyz);

	//	could offset eye ray too?
	vec3 EyeRay = vec3(ScreenOffsetUv,-1);
	vec3 Reflection = reflect( EyeRay, Normal );
	vec3 Refraction = refract( EyeRay, Normal, RefractionIncidence );
	float Fresnel = GetFresnel( EyeRay,Normal);
	
	Specular = max( 0.0, dot( normalize(DirToLight), normalize(Reflection) ) );
	//Specular *= Specular;
	
	BackgroundUv += Refraction.xy;

	//float Density = LiquidDensity * (1.0-Specular);
	//Colour = mix( BackgroundColour, LiquidColour, Density );
	//Colour = BackgroundColour;

	Specular = (Specular>SpecularMinDot) ? 1.0 : 0.0;
	//float SpecularFactor = 1.0-clamp( Range(Specular,SpecularMinDot,1.0), 0.0, 1.0 );
	
	Specular = max( Specular, Fresnel );
}


void main()
{
	//	visualise sdf
	float Distance = GetDistance(FragUv);
	if ( DebugSdfSample )
	{
		vec3 Rgb = vec3(0,1,0);
		if ( Distance < 0.0 )
			Rgb = vec3(1,0,0);
		float Sub = fract(Distance*20.0);
		Sub = Sub < 0.5 ? 0.0 : 1.0;
		Rgb *= Sub;
		gl_FragColor = vec4( Rgb, 1.0 );
		return;
	}


	vec2 RedOffset = vec2( RedOffsetX,RedOffsetY);
	vec2 GreenOffset = vec2(0.0,0.0);
	vec2 BlueOffset = vec2(BlueOffsetX,BlueOffsetY);
	vec2 RedBackgroundUv;
	vec2 GreenBackgroundUv;
	vec2 BlueBackgroundUv;
	float RedSpecular;
	float GreenSpecular;
	float BlueSpecular;
	Trace( FragUv, RedOffset,RedBackgroundUv,RedSpecular);
	Trace( FragUv, GreenOffset,GreenBackgroundUv,GreenSpecular);
	Trace( FragUv, BlueOffset,BlueBackgroundUv,BlueSpecular);

	vec3 RedBackgroundColour = GetBackgroundColour(RedBackgroundUv);
	vec3 GreenBackgroundColour = GetBackgroundColour(GreenBackgroundUv);
	vec3 BlueBackgroundColour = GetBackgroundColour(BlueBackgroundUv);

	RedBackgroundColour = mix( RedBackgroundColour, SpecularColour, RedSpecular ); 
	GreenBackgroundColour = mix( GreenBackgroundColour, SpecularColour, GreenSpecular ); 
	BlueBackgroundColour = mix( BlueBackgroundColour, SpecularColour, BlueSpecular ); 

	vec3 Colour;
	Colour.x = RedBackgroundColour.x;
	Colour.y = GreenBackgroundColour.y;
	Colour.z = BlueBackgroundColour.z;



	gl_FragColor.xyz = Colour;
	gl_FragColor.w =1.0;
}

