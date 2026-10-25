"""Off Paper - Powered by Tokeniser: score and sound design for the opening.

Everything is synthesised here from sine waves and seeded noise: no samples, loops, sound
libraries or AI music services, and no voice of any kind. Timings come from build/cues.json,
which tools/cues.mjs writes from src/opening/timeline.js, so every sound lands on its picture.

Music: 120 bpm, one bar per 2 s, in B flat major:
  Gm9 | Gm9 | Ebmaj7#11 | Bb/D | Cm9 | F7sus4 | Bbmaj9 | Bbmaj9 (hold, fade)

Usage: python3 tools/score.py  ->  deliverables/4-opening/off-paper-opening-score.wav
"""
import json
import os
import subprocess
import sys

import numpy as np
import scipy.signal as ss
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
cues = json.load(open(os.path.join(ROOT, 'build/cues.json')))
DUR = cues['duration']
N = int(SR * DUR)
rng = np.random.default_rng(2026)

dry = np.zeros((2, N))      # goes to the reverb as well
low = np.zeros((2, N))      # sub and kick: kept out of the reverb


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def pan_gains(p):
    a = (p + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def place(bus, sig, start, gain=1.0, pan=0.0):
    """Add a mono (or stereo) signal to a bus at `start` seconds; pan may be a scalar or an array."""
    i = int(round(start * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        n = min(len(sig), N - i)
        lg, rg = pan_gains(pan if np.isscalar(pan) else pan[:n])
        bus[0, i:i + n] += sig[:n] * gain * lg
        bus[1, i:i + n] += sig[:n] * gain * rg
    else:
        n = min(sig.shape[1], N - i)
        bus[:, i:i + n] += sig[:, :n] * gain


def env(n, a, r, curve=2.0):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na) ** curve
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


def bl_saw(f, n, detune_cents=0.0, phase=0.0):
    """Band-limited sawtooth by additive synthesis (no aliasing)."""
    f = f * 2 ** (detune_cents / 1200)
    x = np.zeros(n)
    t = tt(n)
    for k in range(1, int(min(48, 15000 / f)) + 1):
        x += np.sin(2 * np.pi * f * k * t + phase * k) / k
    return x * (2 / np.pi)


def lowpass(x, fc, order=2):
    sos = ss.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return ss.sosfilt(sos, x)


def highpass(x, fc, order=2):
    sos = ss.butter(order, fc, 'high', fs=SR, output='sos')
    return ss.sosfilt(sos, x)


def bandpass(x, lo, hi, order=2):
    sos = ss.butter(order, [lo, hi], 'band', fs=SR, output='sos')
    return ss.sosfilt(sos, x)


def moving_band(noise, fc_of_t, width_oct=0.6):
    """Time-varying band-pass via STFT: keeps a Gaussian band (in octaves) around fc(t)."""
    f, t, Z = ss.stft(noise, SR, nperseg=2048, noverlap=1536)
    fc = fc_of_t(t)[None, :]
    with np.errstate(divide='ignore'):
        oct_dist = np.log2(np.maximum(f[:, None], 1) / fc)
    Z *= np.exp(-0.5 * (oct_dist / width_oct) ** 2)
    _, y = ss.istft(Z, SR, nperseg=2048, noverlap=1536)
    return y[:len(noise)]


def fm_bell(f, dur, index=5.0, ratio=3.5, decay=2.4, bright=0.25):
    n = int(dur * SR)
    t = tt(n)
    I = index * np.exp(-t / (decay * bright))
    y = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t))
    y += 0.25 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / (decay * 0.4))
    return y * np.exp(-t / decay) * (1 - np.exp(-t / 0.002))


def pluck(f, dur=0.6):
    """Additive pluck: upper partials die faster than the fundamental."""
    n = int(dur * SR)
    t = tt(n)
    y = np.zeros(n)
    for k in range(1, 14):
        if f * k > 14000:
            break
        y += np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (4 + 3.2 * k))
    return y * (1 - np.exp(-t / 0.0015))


# ---------------------------------------------------------------- harmony
BARS = [  # (start, end, chord tones as MIDI, root for the sub)
    (0.0, 4.0, [43, 50, 58, 65, 69], 31),          # Gm9
    (4.0, 6.0, [39, 46, 55, 62, 69], 27),          # Ebmaj7#11
    (6.0, 8.0, [38, 53, 58, 62, 65, 72], 26),      # Bb/D add9
    (8.0, 10.0, [36, 43, 51, 58, 62], 24),         # Cm9
    (10.0, 12.0, [41, 48, 51, 58, 60], 29),        # F7sus4
    (12.0, 16.0, [34, 41, 50, 57, 60, 65], 22),    # Bbmaj9
]

# pad: three detuned band-limited saws per note, low-passed; the filter opens as the piece builds
cutoffs = [900, 1700, 2200, 2700, 3300, 4000]
for bi, (a, b, notes, root) in enumerate(BARS):
    n = int((b - a + 0.6) * SR)
    v = np.zeros((2, n))
    for m in notes:
        f = midi(m + 12) if m < 40 else midi(m)
        for d, p in ((-7, -0.5), (0, 0.0), (7, 0.5)):
            s = bl_saw(f, n, d, phase=rng.uniform(0, 6.28))
            lg, rg = pan_gains(p * 0.95)
            v[0] += s * lg
            v[1] += s * rg
    v = np.vstack([lowpass(v[0], cutoffs[bi]), lowpass(v[1], cutoffs[bi])]) / (len(notes) * 2.2)
    e = env(n, 0.35 if bi else 2.6, 0.6, 1.5)
    place(dry, v * e, a, gain=0.5)
    # sub: the root as a sine, two octaves of weight
    s = np.sin(2 * np.pi * midi(root + 12) * tt(n)) + 0.3 * np.sin(2 * np.pi * midi(root + 24) * tt(n))
    place(low, s * env(n, 0.4 if bi else 2.0, 0.5), a, gain=0.12)

# air: the texture of the land, soft and wide (two decorrelated noises)
air = np.vstack([lowpass(highpass(rng.standard_normal(N), 900), 5200) for _ in range(2)])
air *= (0.5 + 0.5 * np.sin(2 * np.pi * 0.23 * tt(N)))[None] * env(N, 1.5, 1.2)[None]
air *= (1 - np.clip((tt(N) - 12.0) / 0.4, 0, 1) * 0.6)[None]
place(dry, air, 0, gain=0.016)

# first light: a pure high tone opens with the dawn line, with a breath of noise under it
n = int(3.2 * SR)
tone = np.sin(2 * np.pi * midi(89) * tt(n)) * env(n, 1.2, 1.8, 1.6)
tone2 = np.sin(2 * np.pi * (midi(89) + 0.6) * tt(n)) * env(n, 1.2, 1.8, 1.6)
place(dry, np.vstack([tone, tone2]), 0.1, gain=0.028)
breath = moving_band(rng.standard_normal(n), lambda t: 900 * 2 ** (2.5 * np.clip(t / 1.6, 0, 1)), 0.8) * env(n, 1.4, 1.6, 1.6)
place(dry, breath, 0.1, gain=0.05)

# the light sweep: a filtered rush that crosses the stereo field with the light, left to right
s0, s1 = cues['sweep']
n = int((s1 - s0 + 0.6) * SR)
sw = moving_band(rng.standard_normal(n), lambda t: 500 * 2 ** (2.6 * np.sin(np.pi * np.clip(t / (s1 - s0), 0, 1))), 0.5)
sw *= np.sin(np.pi * np.clip(tt(n) / (s1 - s0 + 0.6), 0, 1)) ** 2
place(dry, sw, s0, gain=0.09, pan=np.linspace(-0.85, 0.85, n))

# rings lifting off the hill: one bell each, rising through E flat lydian
for k, t0 in enumerate(cues['ringLift']):
    note = [70, 74, 77, 79, 81, 86][k]
    b = fm_bell(midi(note), 3.0, index=3.2, ratio=3.5, decay=1.8)
    pk = [-0.5, 0.4, -0.25, 0.55, -0.6, 0.2][k]
    place(dry, b, t0, gain=0.15 + 0.035 * k, pan=pk)
    # a glint: a very short bright tick marks the moment the ring leaves the ground
    n = int(0.02 * SR)
    place(dry, highpass(rng.standard_normal(n), 5000) * np.exp(-tt(n) / 0.004), t0, gain=0.09, pan=pk)
    # a low swell under each lift
    m = int(1.2 * SR)
    place(dry, lowpass(rng.standard_normal(m), 400) * env(m, 0.5, 0.7), t0 - 0.2, gain=0.05)

# pulse: a soft kick on every beat from bar 4, with the pad ducking under it
beats = np.arange(6.0, 11.76, 0.5)
duck = np.ones(N)
for b0 in beats:
    n = int(0.45 * SR)
    t = tt(n)
    f = 46 + 70 * np.exp(-t / 0.035)
    k = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    click = highpass(rng.standard_normal(int(0.006 * SR)), 2500) * np.linspace(1, 0, int(0.006 * SR))
    place(low, k, b0, gain=0.4 if b0 < 10 else 0.46)
    place(dry, click, b0, gain=0.05)
    i = int(b0 * SR)
    m = int(0.42 * SR)
    duck[i:i + m] = np.minimum(duck[i:i + m], 1 - 0.35 * np.exp(-tt(m) / 0.12))
dry *= duck[None]

# ticks: off-beat hats from bar 4 (very quiet), then sixteenth plucks through the run
for h in np.arange(7.25, 11.8, 0.5):
    n = int(0.06 * SR)
    hat = highpass(rng.standard_normal(n), 7000) * np.exp(-tt(n) / 0.018)
    place(dry, hat, h, gain=0.065 * (0.8 + 0.4 * rng.random()), pan=0.3)
arp = {8.0: [60, 63, 67, 70, 74, 70, 67, 63], 10.0: [65, 70, 72, 75, 77, 75, 72, 70]}
for bar, seq in arp.items():
    for j in range(16):
        t0 = bar + j * 0.125
        if t0 > 11.8:
            break
        place(dry, pluck(midi(seq[j % 8])), t0, gain=0.08 + 0.025 * (j % 4 == 0), pan=0.45 * np.sin(j * 1.3))

# the run: a whoosh for each ring the camera passes through, panned off the centre
for j, pt in enumerate(cues['ringPass']):
    n = int(0.5 * SR)
    w = moving_band(rng.standard_normal(n), lambda t: 3200 * 2 ** (-2.4 * np.clip(t / 0.35, 0, 1)), 0.7)
    w *= (1 - np.exp(-tt(n) / 0.012)) * np.exp(-np.maximum(tt(n) - 0.05, 0) / 0.12)
    place(dry, w, pt - 0.05, gain=0.16, pan=0.35 * (-1) ** j)
    # the instant the ring passes the camera: a crisp transient
    m_ = int(0.03 * SR)
    place(dry, bandpass(rng.standard_normal(m_), 1800, 9000) * np.exp(-tt(m_) / 0.006), pt, gain=0.16, pan=0.2 * (-1) ** j)

# riser into the impact, cut just before it so the hit lands in a breath of silence
r0, r1 = 10.4, 11.94
n = int((r1 - r0) * SR)
x = np.clip(tt(n) / (r1 - r0), 0, 1)
ris = moving_band(rng.standard_normal(n), lambda t: 400 * 2 ** (4.2 * np.clip(t / (r1 - r0), 0, 1) ** 1.6), 0.45) * x ** 2.2
gl = np.sin(2 * np.pi * np.cumsum(midi(57) * 2 ** (2 * x ** 1.8)) / SR) * x ** 2.5
place(dry, np.vstack([ris + 0.25 * gl, ris + 0.25 * gl]), r0, gain=0.22)
gap = (tt(N) > 11.94) & (tt(N) < cues['impact'])
dry[:, gap] *= 0.0
low[:, gap] *= 0.0

# impact: sub drop, a low burst, the resolving chord and a high bell
T = cues['impact']
n = int(3.4 * SR)
t = tt(n)
f = midi(34) + 30 * np.exp(-t / 0.08)
boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.1)
place(low, boom, T, gain=0.62)
burst = lowpass(rng.standard_normal(int(1.2 * SR)), 1100) * np.exp(-tt(int(1.2 * SR)) / 0.25)
place(dry, burst, T, gain=0.3)
for m, p in zip([46, 53, 62, 69, 72, 77], [-0.5, 0.5, -0.25, 0.25, -0.4, 0.4]):
    place(dry, fm_bell(midi(m), 4.2, index=1.6, ratio=1.0, decay=2.6, bright=0.15), T, gain=0.07, pan=p)
place(dry, fm_bell(midi(86), 4.0, index=2.4, ratio=3.5, decay=2.2), T + 0.02, gain=0.07, pan=0.15)

# the name, the sub line and the logo each get a quiet glass tap
for t0, m, p in ((cues['nameIn'][0], 89, -0.2), (cues['subIn'][0], 84, 0.25), (cues['logoIn'][0], 86, 0.05)):
    place(dry, fm_bell(midi(m), 2.0, index=1.2, ratio=2.0, decay=0.9), t0 + 0.06, gain=0.05, pan=p)

# the light along the horizon: a soft high shimmer crossing left to right
n = int(1.2 * SR)
sh = moving_band(rng.standard_normal(n), lambda t: 7000 + 0 * t, 0.35) * np.sin(np.pi * tt(n) / 1.2) ** 2
place(dry, sh, 13.85, gain=0.05, pan=np.linspace(-0.9, 0.9, n))

# ---------------------------------------------------------------- mix
# reverb: stereo exponentially decaying noise (about 3 s), darker as it decays
n = int(3.2 * SR)
t = tt(n)
ir = []
for c in range(2):
    e = rng.standard_normal(n) * np.exp(-t / 0.46)
    e = lowpass(e, 6500) * 0.6 + lowpass(e, 1800) * 0.4
    e[: int(0.018 * SR)] = 0
    ir.append(e / np.sqrt(np.sum(e ** 2)))
wet = np.vstack([ss.fftconvolve(dry[c], ir[c])[:N] for c in range(2)])
mix = dry + 0.32 * wet + low

# tame the lowest rumble and the top, then a gentle bus compression and a look-ahead peak limiter
mix = np.vstack([lowpass(highpass(mix[c], 28), 17500) for c in range(2)])
lvl = np.sqrt(ss.sosfiltfilt(ss.butter(1, 6, fs=SR, output='sos'), np.mean(mix ** 2, axis=0)) + 1e-12)
thr = np.percentile(lvl, 90) * 0.8
gain = np.where(lvl > thr, (lvl / thr) ** (1 / 2.0 - 1), 1.0)
mix *= gain[None]
peak = np.max(np.abs(mix), axis=0)
look = int(0.004 * SR)
pk = np.array([np.max(peak[max(0, i - look):i + look]) for i in range(0, N, 64)])
pk = np.repeat(pk, 64)[:N]
lim = np.minimum(1.0, 0.89 / np.maximum(pk, 1e-9))
lim = ss.sosfiltfilt(ss.butter(1, 30, fs=SR, output='sos'), lim)
mix *= np.minimum(lim, 1.0)[None]

# a true breath of silence just before the impact (applied after the reverb, with short fades)
gate = np.ones(N)
g0, g1 = int(11.935 * SR), int((cues['impact'] - 0.002) * SR)
fd = int(0.006 * SR)
gate[g0:g1] = 0.0
gate[g0 - fd:g0] = np.linspace(1, 0, fd)
mix *= gate[None]

# fade out with the picture, then exact digital silence for a clean cut
fo0, fo1 = cues['fadeOut'][0], cues['silenceFrom']
g = np.ones(N)
tN = tt(N)
g[tN >= fo0] = np.clip(1 - (tN[tN >= fo0] - fo0) / (fo1 - fo0), 0, 1) ** 1.6
mix *= g[None]
mix[:, tN >= fo1] = 0.0
mix[:, : int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))[None]

mix /= np.max(np.abs(mix)) / 0.89
os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
raw = os.path.join(ROOT, 'build/score-raw.wav')
wavfile.write(raw, SR, mix.T.astype(np.float32))

# loudness: two-pass EBU R128, linear gain, to -16 LUFS integrated and -1.5 dBTP
out = os.path.join(ROOT, 'deliverables/4-opening/off-paper-opening-score.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
af = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-c:a', 'pcm_s24le', '-map_metadata', '-1', out], check=True)
print('wrote', os.path.relpath(out, ROOT), 'input loudness', m['input_i'], 'LUFS')
