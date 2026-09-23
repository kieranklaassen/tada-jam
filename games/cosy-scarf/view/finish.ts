import { Effect, EffectAttribute } from 'postprocessing'
import * as THREE from 'three'

// The one full-screen pass. It tone-maps itself (so the blurred taps and the
// sharp centre go through the same curve), softens the far hillside and the
// near blanket edge with a tilt-shift, lets the colours away from the loom
// sink a little greyer, and adds a warm vignette. The lower tiers skip it
// and use the renderer's ACES tone mapping instead: same exposure, no grade.

const shader = /* glsl */ `
uniform float focusCenter;
uniform float focusBand;
uniform float blurRadius;
uniform float blurTaps;
uniform float exposure;
uniform float recede;
uniform float vignette;

vec3 acesFit(vec3 color) {
  const mat3 inputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 outputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color = inputMat * (color * exposure / 0.6);
  vec3 a = color * (color + 0.0245786) - 0.000090537;
  vec3 b = color * (0.983729 * color + 0.4329510) + 0.238081;
  return clamp(outputMat * (a / b), 0.0, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float away = max(0.0, abs(uv.y - focusCenter) - focusBand);
  float amount = smoothstep(0.0, 0.3, away) * blurRadius;
  vec3 color = inputColor.rgb;
  if (amount > 0.05 && blurTaps > 0.5) {
    vec3 sum = color;
    float weight = 1.0;
    for (int i = 0; i < 8; i++) {
      if (float(i) >= blurTaps) break;
      float a = float(i) * (6.28318 / blurTaps) + 0.4;
      vec2 offset = vec2(cos(a), sin(a)) * texelSize * amount;
      sum += texture2D(inputBuffer, uv + offset).rgb;
      sum += texture2D(inputBuffer, uv + offset * 0.45).rgb;
      weight += 2.0;
    }
    color = sum / weight;
  }
  color = acesFit(color);
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float calm = smoothstep(0.0, 0.32, away) * recede;
  color = mix(color, mix(vec3(luma), color, 0.72) * 0.97 + 0.03, calm);
  color = mix(vec3(luma), color, 1.0 + 0.08 * (1.0 - calm));
  vec2 centered = uv - vec2(0.5, 0.52);
  color *= 1.0 - vignette * smoothstep(0.38, 0.9, length(centered * vec2(1.0, 1.2)));
  color += vec3(0.018, 0.008, -0.012);
  outputColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
}
`

export type FinishOptions = { focusCenter: number; focusBand: number; exposure: number; recede: number; vignette: number }

export class KnitFinishEffect extends Effect {
  constructor(options: FinishOptions) {
    super('KnitFinishEffect', shader, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['focusCenter', new THREE.Uniform(options.focusCenter)],
        ['focusBand', new THREE.Uniform(options.focusBand)],
        ['blurRadius', new THREE.Uniform(0)],
        ['blurTaps', new THREE.Uniform(0)],
        ['exposure', new THREE.Uniform(options.exposure)],
        ['recede', new THREE.Uniform(options.recede)],
        ['vignette', new THREE.Uniform(options.vignette)],
      ]),
    })
  }

  setBlur(radius: number, taps: number): void {
    this.uniforms.get('blurRadius')!.value = radius
    this.uniforms.get('blurTaps')!.value = taps
  }

  setFocus(center: number, band: number): void {
    this.uniforms.get('focusCenter')!.value = center
    this.uniforms.get('focusBand')!.value = band
  }
}
