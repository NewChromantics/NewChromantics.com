attribute vec2 VertexIndexTriangleIndex;
varying vec2 TriangleUv;
varying float3 TriangleVelocity;

uniform sampler2D WorldPositions;
uniform int WorldPositionsWidth;
uniform int WorldPositionsHeight;
uniform sampler2D Velocitys;

uniform float LocalScale;
uniform float WorldScale;
uniform float ParticleVertexScale;
uniform float ProjectionAspectRatio;

uniform vec3 LocalPositions[3];/* = vec3[3](
								vec3( -1,-1,0 ),
								vec3( 1,-1,0 ),
								vec3( 0,1,0 )
								);*/


vec2 GetTriangleUv(int TriangleIndex)
{
	float t = float(TriangleIndex);
	
	//	index->uv
	float x = mod( t, float(WorldPositionsWidth) );
	float y = (t-x) / float(WorldPositionsWidth);
	float u = x / float(WorldPositionsWidth);
	float v = y / float(WorldPositionsHeight);

	float2 uv = float2(u,v);
	return uv;
}

vec3 GetTriangleWorldPos(int TriangleIndex,out vec3 Velocity)
{
	float2 uv = GetTriangleUv( TriangleIndex );
	float Lod = 0.0;
	float2 xy = textureLod( WorldPositions, uv, Lod ).xy;
	
	//	gr: this sample kills perf
	//Velocity = textureLod( Velocitys, uv, Lod ).xyz;
	Velocity = float3(0,0,0);
	return float3(xy,0);
}

float GetTriangleLocalScale(int TriangleIndex)
{
	float2 uv = GetTriangleUv( TriangleIndex );
	float Lod = 0.0;
	float Radius = textureLod( WorldPositions, uv, Lod ).z;

	//	bad texture?
	if ( Radius == 0.0 )
	{
		//Radius = 1.0;
	}
	
	//Radius *= 100.0;

	Radius *= LocalScale * WorldScale;
	//	reduce size for speed to reduce overdraw
	Radius *= ParticleVertexScale;
	return Radius;
}


void main()
{
	int VertexIndex = int(VertexIndexTriangleIndex.x);
	int TriangleIndex = int(VertexIndexTriangleIndex.y);
	
	float3 VertexPos = LocalPositions[VertexIndex] * GetTriangleLocalScale(VertexIndex);
	float3 LocalPos = VertexPos;
	
	float3 Velocity3;
	float3 WorldPos = GetTriangleWorldPos(TriangleIndex, Velocity3) * WorldScale;
	
	WorldPos += LocalPos;
	
	float4 ProjectionPos = float4( WorldPos.x * ProjectionAspectRatio, WorldPos.y, 0, 1 );
	gl_Position = ProjectionPos;
	//	gr: move 0..1 to viewport space
	gl_Position.xy = mix( float2(-1,-1), float2(1,1), gl_Position.xy );

	TriangleUv = LocalPositions[VertexIndex].xy;
	TriangleVelocity = Velocity3;
}

