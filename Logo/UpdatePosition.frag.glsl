precision highp float;

varying vec2 uv;
uniform sampler2D OrigPositions;
uniform sampler2D LastPositions;
uniform sampler2D Velocitys;
const float PhysicsStep = 1.0/60.0;

uniform float SpringForcePowerk;
#define SpringForcePower	(SpringForcePowerk/1000.0)

void main()
{
	//	gr: this should make sure it's sample middle of texel
	vec4 Pos = texture2D( LastPositions, uv );
	vec4 Vel = texture2D( Velocitys, uv );
	
	Pos.xy += Vel.xy * PhysicsStep;

	gl_FragColor = Pos;
}


