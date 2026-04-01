'use client'

import { useEffect, useRef } from 'react'

const VERTEX = `
attribute vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT = `
precision highp float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;   // normalized 0-1, center-biased offset
uniform float u_time;
uniform float u_hover;   // 0.0 = idle, 1.0 = mouse over orb

// ── Noise ──────────────────────────────────────────
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    // Orb stays centered, mouse only nudges it slightly
    vec2 center = u_mouse * 0.06;
    vec2 d = p - center;
    float dist = length(d);
    float angle = atan(d.y, d.x);

    // Scale up when hovered
    float scale = 1.0 + u_hover * 0.35;
    float sd = dist / scale;

    // ── Small, sharp white core ────────────────────
    float core = exp(-sd * sd * 120.0) * 2.0;

    // ── Tight bright inner glow ────────────────────
    float inner = exp(-sd * sd * 22.0) * 1.0;

    // ── Blue mid glow ──────────────────────────────
    float mid = exp(-sd * 5.0) * 0.5;

    // ── Wide atmospheric glow ──────────────────────
    float atmo = exp(-sd * 2.0) * 0.2;

    // ── Horizontal anamorphic streak ───────────────
    float sy = abs(d.y) / scale;
    float streak = exp(-sy * 35.0) * exp(-sd * 0.7) * 0.6;
    float longStreak = exp(-sy * 60.0) * exp(-abs(d.x) * 0.3) * 0.12;

    // ── Plasma tendrils (like the image — visible wisps) ──
    // Tendril 1: thick slow swirls
    float t1 = fbm(vec2(angle * 2.0 + u_time * 0.12, sd * 4.0 - u_time * 0.5));
    t1 = pow(t1, 1.2) * exp(-sd * 2.2) * 1.0;

    // Tendril 2: thinner, faster
    float t2 = fbm(vec2(angle * 3.5 - u_time * 0.2, sd * 7.0 - u_time * 0.9));
    t2 = pow(t2, 1.8) * exp(-sd * 2.8) * 0.7;

    // Tendril 3: fine electric arcs
    float t3 = fbm(vec2(angle * 5.0 + u_time * 0.35, sd * 10.0 - u_time * 1.3));
    t3 = pow(t3, 2.5) * exp(-sd * 3.0) * 0.5;

    // Directional rays — bright spokes that rotate slowly
    float spoke = sin(angle * 3.0 + u_time * 0.3) * 0.5 + 0.5;
    spoke *= exp(-sd * 2.5) * 0.3;

    // Pulsing energy burst
    float pulse = sin(u_time * 1.2) * 0.5 + 0.5;
    float burst = fbm(vec2(angle * 4.0 + u_time * 0.4, sd * 12.0));
    burst = pow(burst, 3.0) * exp(-sd * 3.5) * pulse * 0.6;

    // ── Corona ring ────────────────────────────────
    float coronaR = 0.07 / scale;
    float corona = exp(-pow(sd - coronaR, 2.0) * 1200.0) * 0.35;
    corona *= 0.5 + 0.5 * fbm(vec2(angle * 6.0, u_time * 0.7));

    // ── Colors ─────────────────────────────────────
    // Core: pure white
    vec3 col = vec3(1.0, 1.0, 1.0) * core;

    // Inner glow: white transitioning to blue
    col += vec3(0.7, 0.85, 1.0) * inner;

    // Mid: blue
    col += vec3(0.15, 0.4, 1.0) * mid;

    // Atmosphere
    col += vec3(0.06, 0.18, 0.6) * atmo;

    // Streaks
    col += vec3(0.2, 0.5, 1.0) * streak;
    col += vec3(0.1, 0.3, 0.8) * longStreak;

    // Plasma tendrils — the key visual
    col += vec3(0.15, 0.45, 1.0) * t1;
    col += vec3(0.1, 0.35, 0.9) * t2;
    col += vec3(0.3, 0.6, 1.0) * t3;

    // Spokes
    col += vec3(0.12, 0.35, 0.85) * spoke;

    // Burst
    col += vec3(0.35, 0.65, 1.0) * burst;

    // Corona
    col += vec3(0.3, 0.6, 1.0) * corona;

    // Ambient
    col += vec3(0.01, 0.03, 0.1) * exp(-dist * 0.8);

    // HDR tone-map — high exposure to keep it bright
    col = 1.0 - exp(-col * 1.8);

    gl_FragColor = vec4(col, 1.0);
}
`

export default function PlasmaCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext('webgl', { alpha: false, antialias: false })
        if (!gl) return

        // ── Compile ────────────────────────────────────
        const compile = (type: number, src: string) => {
            const s = gl.createShader(type)!
            gl.shaderSource(s, src)
            gl.compileShader(s)
            if (!gl.getShaderInfoLog(s)) console.warn(gl.getShaderInfoLog(s))
            return s
        }

        const vs = compile(gl.VERTEX_SHADER, VERTEX)
        const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT)
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        gl.useProgram(prog)

        // ── Quad ───────────────────────────────────────
        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, 'a_position')
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        // ── Uniforms ───────────────────────────────────
        const uRes   = gl.getUniformLocation(prog, 'u_resolution')
        const uMouse = gl.getUniformLocation(prog, 'u_mouse')
        const uTime  = gl.getUniformLocation(prog, 'u_time')
        const uHover = gl.getUniformLocation(prog, 'u_hover')

        // ── State ──────────────────────────────────────
        // Mouse offset from center (normalized -0.5 to 0.5)
        let mouseRaw = { x: 0, y: 0 }
        let mouseSmooth = { x: 0, y: 0 }
        let hoverTarget = 0
        let hoverSmooth = 0
        let animId: number

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            gl.viewport(0, 0, canvas.width, canvas.height)
        }

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            // Offset from center: -0.5 to 0.5
            mouseRaw.x = (e.clientX - rect.left) / rect.width - 0.5
            mouseRaw.y = -(((e.clientY - rect.top) / rect.height) - 0.5) // flip Y

            // Check if mouse is near center (over the orb)
            const distFromCenter = Math.sqrt(mouseRaw.x * mouseRaw.x + mouseRaw.y * mouseRaw.y)
            hoverTarget = distFromCenter < 0.2 ? 1 : 0
        }

        const onMouseLeave = () => {
            mouseRaw.x = 0
            mouseRaw.y = 0
            hoverTarget = 0
        }

        const start = performance.now()

        const render = () => {
            const t = (performance.now() - start) / 1000

            // Smooth follow (slow, orb barely moves)
            mouseSmooth.x += (mouseRaw.x - mouseSmooth.x) * 0.03
            mouseSmooth.y += (mouseRaw.y - mouseSmooth.y) * 0.03

            // Smooth hover transition
            hoverSmooth += (hoverTarget - hoverSmooth) * 0.05

            gl.uniform2f(uRes, canvas.width, canvas.height)
            gl.uniform2f(uMouse, mouseSmooth.x, mouseSmooth.y)
            gl.uniform1f(uTime, t)
            gl.uniform1f(uHover, hoverSmooth)

            gl.drawArrays(gl.TRIANGLES, 0, 6)
            animId = requestAnimationFrame(render)
        }

        resize()
        window.addEventListener('resize', resize)
        canvas.addEventListener('mousemove', onMouseMove)
        canvas.addEventListener('mouseleave', onMouseLeave)
        animId = requestAnimationFrame(render)

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', resize)
            canvas.removeEventListener('mousemove', onMouseMove)
            canvas.removeEventListener('mouseleave', onMouseLeave)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            aria-label="Animated plasma background"
            role="img"
            style={{
                display: 'block',
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
            }}
        />
    )
}
