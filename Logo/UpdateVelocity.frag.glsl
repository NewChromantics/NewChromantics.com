precision highp float;

varying vec2 uv;
uniform sampler2D OrigPositions;
uniform sampler2D LastPositions;
uniform sampler2D LastVelocitys;
const float PhysicsStep = 1.0/60.0;

uniform float SpringForcePowerk;
#define SpringForcePower	(SpringForcePowerk/1000.0)

uniform float DragForcePowerk;
#define DragForcePower	(DragForcePowerk/1000.0)

uniform float GravityForcePowerk;
#define GravityForcePower	(GravityForcePowerk/1000.0)

uniform float ForceNoiseMink;
#define ForceNoiseMin	(ForceNoiseMink/1000.0)

uniform float ForceNoiseMaxk;
#define ForceNoiseMax	(ForceNoiseMaxk/1000.0)

uniform vec2 RepelPosition;
uniform float RepelRadiusk;
#define RepelRadius	(RepelRadiusk/1000.0)
uniform float RepelForceMink;
#define RepelForceMin	(RepelForceMink/1000.0)
uniform float RepelForceMaxk;
#define RepelForceMax	(RepelForceMaxk/1000.0)

void main()
{
	vec4 Vel = texture2D( LastVelocitys, uv );
	vec4 Pos = texture2D( LastPositions, uv );
	vec2 Noise = mix( vec2(ForceNoiseMin), vec2(ForceNoiseMax), Pos.zw );

	Vel.y -= GravityForcePower*Noise.x;
	Vel.x -= 0.01*GravityForcePower*Noise.y;
	
	//	spring
	{
		vec2 Target = texture2D( OrigPositions, uv ).xy;
		vec2 SpringForce = (Target - Pos.xy) * SpringForcePower;
		Vel.xy += SpringForce;
	}

	//	repel
	{
		vec2 RepelForce = -1.0 * (RepelPosition - Pos.xy);
		float RepelDistance = length( RepelForce );
		if ( RepelDistance <= RepelRadius )
		{
			RepelForce = normalize(RepelForce);
			RepelDistance = 1.0 - (RepelDistance/RepelRadius);
			RepelForce *= mix( RepelForceMin, RepelForceMax, Noise.x );
			Vel.xy += RepelForce;
		}
	}


	Vel *= 1.0 - (DragForcePower*Noise.x);

	Vel.w = 1.0;
	gl_FragColor = Vel;
}


