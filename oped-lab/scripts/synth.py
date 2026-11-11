"""make-bgm.py と make-sfx.py が使う小さな合成部品(numpy のみ)。
乱数は種を固定しているので、何度実行しても同じ音になる。"""
import os
import wave

import numpy as np

SR = 44100
RNG = np.random.default_rng(20261111)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def midi_hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def env_adsr(n, a=0.005, d=0.1, s=0.7, r=0.1, hold=None):
    """n サンプルの ADSR。hold はリリース開始までの秒数(既定は n - r)。"""
    t = np.arange(n) / SR
    total = n / SR
    hold = total - r if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = np.clip((t - hold) / max(r, 1e-6), 0, 1)
    return e * (1 - rel)


def saw(freq, dur, cutoff=4000.0, detune_cents=0.0, decay_k=0.0):
    """帯域制限したのこぎり波。decay_k > 0 で高い倍音ほど早く減衰する(はじく音)。"""
    t = t_axis(dur)
    f = freq * 2 ** (detune_cents / 1200)
    K = max(1, min(48, int(cutoff / f)))
    out = np.zeros_like(t)
    for k in range(1, K + 1):
        amp = 1.0 / k
        if decay_k:
            amp = amp * np.exp(-t * decay_k * k)
        out += amp * np.sin(2 * np.pi * k * f * t)
    return out * 0.6


def square(freq, dur, cutoff=4000.0, vibrato=0.0):
    t = t_axis(dur)
    vib = 1 + vibrato * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.2, 0, 1)
    phase = 2 * np.pi * freq * np.cumsum(vib) / SR
    K = max(1, min(31, int(cutoff / freq)))
    out = np.zeros_like(t)
    for k in range(1, K + 1, 2):
        out += np.sin(k * phase) / k
    return out * 0.7


def noise(dur):
    return RNG.standard_normal(int(dur * SR))


def highpass(x, amount=1):
    for _ in range(amount):
        x = np.diff(x, prepend=0.0)
    return x


def shaped_noise(dur, lo_fn, hi_fn, block=2048):
    """時間とともに通過帯域が変わるノイズ(風切り音、ライザー)。
    lo_fn, hi_fn は 0〜1 の進み具合を受け取って Hz を返す。"""
    n = int(dur * SR)
    src = RNG.standard_normal(n + block)
    out = np.zeros(n + block)
    win = np.hanning(block)
    hop = block // 2
    freqs = np.fft.rfftfreq(block, 1 / SR)
    for start in range(0, n, hop):
        p = start / max(n, 1)
        seg = src[start:start + block] * win
        spec = np.fft.rfft(seg)
        lo, hi = lo_fn(p), hi_fn(p)
        mask = ((freqs >= lo) & (freqs <= hi)).astype(float)
        out[start:start + block] += np.fft.irfft(spec * mask, block)
    out = out[:n]
    return out / (np.max(np.abs(out)) + 1e-9)


def kick(dur=0.45):
    t = t_axis(dur)
    f = 46 + 110 * np.exp(-t / 0.028)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    click = highpass(noise(dur)) * np.exp(-t / 0.004) * 0.25
    return np.tanh((body + click) * 1.6)


def snare(dur=0.3, tone=190):
    t = t_axis(dur)
    n = highpass(noise(dur)) * np.exp(-t / 0.09) * 0.55
    b = np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.045) * 0.8
    return n + b


def hat(dur=0.06, open_=False):
    dur = 0.32 if open_ else dur
    t = t_axis(dur)
    return highpass(noise(dur), 2) * np.exp(-t / (0.11 if open_ else 0.018)) * 0.35


def crash(dur=2.4):
    t = t_axis(dur)
    n = highpass(noise(dur), 2) * np.exp(-t / 0.9) * 0.35
    metal = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate([3120, 4410, 5870, 7210])) * np.exp(-t / 0.6) * 0.03
    return n + metal


def boom(dur=1.6):
    t = t_axis(dur)
    f = 34 + 40 * np.exp(-t / 0.12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7)
    return np.tanh(s * 2.2) * 0.9


def bell(freq, dur=2.0):
    t = t_axis(dur)
    out = np.zeros_like(t)
    for ratio, amp, dec in [(1, 1, 1.2), (2.76, 0.5, 0.6), (5.4, 0.28, 0.3), (8.93, 0.15, 0.15)]:
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / dec)
    return out * 0.35 * np.clip(t / 0.002, 0, 1)


def blip(freq, dur=0.12):
    t = t_axis(dur)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.03)


def reverb_ir(seconds=1.8, seed=1):
    rng = np.random.default_rng(seed)
    t = t_axis(seconds)
    ir = rng.standard_normal(len(t)) * np.exp(-t / (seconds / 5))
    ir[: int(0.012 * SR)] = 0  # 初期反射までの間
    return ir / np.sqrt(np.sum(ir ** 2))


def fft_convolve(x, h):
    n = len(x) + len(h) - 1
    size = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)
    return y[: len(x)]


class Mix:
    """ステレオの書き込み先。dry と残響送りの2系統を持つ。"""

    def __init__(self, seconds):
        self.n = int(round(seconds * SR))
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)
        self.send = np.zeros(self.n)

    def add(self, sig, at_sec, gain=1.0, pan=0.0, rev=0.0):
        start = int(round(at_sec * SR))
        if start >= self.n or start < 0:
            return
        sig = sig[: self.n - start] * gain
        end = start + len(sig)
        self.L[start:end] += sig * np.sqrt(0.5 * (1 - pan))
        self.R[start:end] += sig * np.sqrt(0.5 * (1 + pan))
        if rev:
            self.send[start:end] += sig * rev

    def render(self, reverb_seconds=1.8, peak_db=-1.0, fade_out=0.0):
        if np.any(self.send):
            self.L += fft_convolve(self.send, reverb_ir(reverb_seconds, 1)) * 0.5
            self.R += fft_convolve(self.send, reverb_ir(reverb_seconds, 2)) * 0.5
        st = np.stack([self.L, self.R], axis=1)
        # 上位 0.1% の山だけが軽く潰れる位置までゲインを下げてから、ゆるいリミッター(tanh)に通す
        st = np.tanh(st * (0.6 / (np.percentile(np.abs(st), 99.9) + 1e-9)))
        if fade_out:
            k = int(fade_out * SR)
            st[-k:] *= np.linspace(1, 0, k)[:, None]
        peak = np.max(np.abs(st)) + 1e-9
        return st * (10 ** (peak_db / 20) / peak)


def write_wav(path, data):
    """data: (n,) か (n, 2) の -1〜1。16bit で書く。"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if data.ndim == 1:
        data = data[:, None]
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(data.shape[1])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', os.path.normpath(path), f'{len(data) / SR:.2f}s')

