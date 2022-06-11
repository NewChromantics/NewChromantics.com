precision highp float;

varying vec2 FragUv;
varying vec2 FragWorldPosition;
varying vec2 FragParticlePosition;

varying float WorldParticleRadius;

uniform float SdfParticleDistancePow;

void main()
{
	float Distance = distance( FragParticlePosition, FragWorldPosition );
	
	Distance /= WorldParticleRadius;
	
	Distance = pow( Distance, SdfParticleDistancePow/10.0 );
	
	gl_FragColor = vec4( Distance, Distance, Distance, 1.0 );
}

