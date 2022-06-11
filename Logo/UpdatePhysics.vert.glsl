const vec4 VertexRect = vec4(0,0,1,1);
attribute vec2 LocalUv;
varying vec2 uv;

void main()
{
	gl_Position = vec4(LocalUv.x,LocalUv.y,0,1);
	uv = LocalUv;

	float l = VertexRect[0];
	float t = VertexRect[1];
	float r = l+VertexRect[2];
	float b = t+VertexRect[3];
	
	l = mix( -1.0, 1.0, l );
	r = mix( -1.0, 1.0, r );
	t = mix( -1.0, 1.0, t );
	b = mix( -1.0, 1.0, b );
	
	gl_Position.x = mix( l, r, LocalUv.x );
	gl_Position.y = mix( t, b, LocalUv.y );
	
	uv = vec2( LocalUv.x, LocalUv.y );
}

