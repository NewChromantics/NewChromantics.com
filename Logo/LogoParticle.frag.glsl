precision highp float;
varying vec2 TriangleUv;
varying vec3 TriangleVelocity;
varying vec2 TriangleSampleUv;

const float ClipRadius = 0.4;

void main()
{
	//float2 uv = TriangleUv - float2(0.5,0.5);
	float2 uv = TriangleUv;
	//uv *= 2.0;
	float Distance = length(uv);
	if ( Distance > ClipRadius )
	{
		discard;
	}
	Distance /= ClipRadius;
	Distance = min( 1.0, Distance );
	//Distance *= Distance;
	Distance = 1.0 - Distance;
	//gl_FragColor = float4(TriangleUv,0,1);
	//gl_FragColor = float4(uv,Distance,Distance);
	
	//	blend mode max is using alpha, so make sure w is distance
	gl_FragColor = float4(Distance,TriangleVelocity.z,TriangleVelocity.x,Distance);
	//	output uv so final renderer can find velocity...
	//gl_FragColor = float4(Distance,TriangleSampleUv.x,TriangleSampleUv.y,Distance);
}

