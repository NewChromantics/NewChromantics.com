precision highp float;

attribute float ParticleIndex;
attribute vec2 LocalUv;

varying vec2 FragUv;

void main()
{
	float z = 0.0;
	float w = 1.0;
	vec2 ProjectionPos = mix( vec2(-1), vec2(1), LocalUv );
	gl_Position = vec4( ProjectionPos, z, w );

	FragUv = LocalUv;
}

