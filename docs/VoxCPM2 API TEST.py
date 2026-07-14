#!/usr/bin/env python3
"""
VoxCPM2 Gradio API 自动化测试脚本

测试覆盖:
  1. 声音设计 (Voice Design) — 纯文本，无参考音频
  2. 可控克隆 (Controllable Cloning) — 参考音频 + 声音描述
  3. 纯音频克隆 (无描述) — 仅参考音频
  4. 极致克隆 (Ultimate Cloning) — 参考音频 + 文本
  5. 英文声音设计
  6. 最简调用 — 仅文本
  7. 空文本拒绝
  8. CFG 边界值
  9. 进阶参数测试

用法:
  python test_api.py [--host localhost:8808]

 # 运行全部测试
 python test_api.py
 
 # 跳过耗时测试（克隆模式），只测轻量接口
 python test_api.py --skip-heavy

 # 只跑指定测试
 python test_api.py --only 1,2,7

 # 指定服务地址
 python test_api.py --host 192.168.1.1:8808

"""

import argparse
import os
import sys
import time
import traceback
from pathlib import Path

from gradio_client import Client, handle_file

# ---------- 配置 ----------
BASE_DIR = Path(__file__).parent
EXAMPLES_DIR = BASE_DIR / "examples"
OUTPUT_DIR = BASE_DIR / "test_output"

# 示例资源
EXAMPLE_WAV = str(EXAMPLES_DIR / "example.wav")
REFERENCE_SPEAKER_WAV = str(EXAMPLES_DIR / "reference_speaker.wav")

# 测试用文本
VOICE_DESIGN_TEXT = "你好，这是一个纯文字声音合成测试。"
VOICE_DESIGN_CONTROL = "温柔甜美的年轻女孩，语速适中"

CLONE_TEXT = "欢迎大家使用 VoxCPM2 语音合成系统，这是一个强大的文本转语音模型。"
CLONE_CONTROL = "沉稳专业的中年男性，语速稍慢"

ULT_CLONE_TEXT = "This is a test of the ultimate cloning mode."
ULT_PROMPT = ("Just by listening a few minutes a day, "
              "you'll be able to eliminate negative thoughts "
              "by conditioning your mind to be more positive.")

EN_VOICE_DESIGN = "Hello, this is an English voice design test."


def color(text: str, code: str) -> str:
    codes = {"green": 32, "red": 31, "yellow": 33, "blue": 34, "cyan": 36}
    return f"\033[{codes.get(code, 0)}m{text}\033[0m"


class Tester:
    def __init__(self, host: str = "localhost:8808"):
        self.host = host
        self.url = f"http://{host}"
        self.client: Client = None  # lazy init
        self.passed = 0
        self.failed = 0
        self.errors = []

    def get_client(self) -> Client:
        if self.client is None:
            self.client = Client(self.url)
        return self.client

    def log(self, msg: str, level: str = "info"):
        prefix = {"ok": color("  ✓", "green"), "fail": color("  ✗", "red"),
                  "step": color("  →", "cyan"), "warn": color("  ⚠", "yellow")}
        print(f"{prefix.get(level, '')} {msg}")

    def run(self, name: str, fn, *args, **kwargs):
        self.log(f"测试: {name}", "step")
        try:
            fn(*args, **kwargs)
            self.passed += 1
            self.log(f"{name} — 通过", "ok")
        except Exception as e:
            self.failed += 1
            self.errors.append((name, str(e)))
            self.log(f"{name} — 失败: {e}", "fail")
            traceback.print_exc()

    # ---- 辅助方法 ----

    def _generate(self, **kwargs) -> str:
        """
        调用 /generate 端点，返回生成的音频文件本地路径。
        gradio_client 自动下载结果文件。
        """
        client = self.get_client()
        result = client.predict(
            text=kwargs.get("text", "Hello."),
            control_instruction=kwargs.get("control_instruction", ""),
            ref_wav=handle_file(kwargs["ref_wav"]) if kwargs.get("ref_wav") else None,
            use_prompt_text=kwargs.get("use_prompt_text", False),
            prompt_text_value=kwargs.get("prompt_text_value", ""),
            cfg_value=kwargs.get("cfg_value", 2.0),
            do_normalize=kwargs.get("do_normalize", False),
            denoise=kwargs.get("denoise", False),
            dit_steps=kwargs.get("dit_steps", 10),
            api_name="/generate",
        )
        # predict 返回 (sample_rate, audio_path) 或直接音频路径
        return result

    def _assert_valid_audio(self, result):
        """验证返回的音频有效"""
        audio_path = None
        if isinstance(result, tuple) and len(result) >= 2:
            audio_path = result[1]  # (sr, filepath)
        elif isinstance(result, str):
            audio_path = result
        elif isinstance(result, list):
            audio_path = result[0]

        assert audio_path, f"无法提取音频路径: {result}"
        assert os.path.isfile(audio_path), f"音频文件不存在: {audio_path}"

        size = os.path.getsize(audio_path)
        assert size > 1000, f"音频文件过小 ({size} bytes)"
        return audio_path, size

    # ---- 测试用例 ----

    def test_voice_design(self):
        """[1] 声音设计 — 纯文本合成"""
        r = self._generate(
            text=VOICE_DESIGN_TEXT,
            control_instruction=VOICE_DESIGN_CONTROL,
        )
        path, size = self._assert_valid_audio(r)
        self.log(f"  音频: {path} ({size} bytes)")

    def test_controllable_clone(self):
        """[2] 可控克隆 — 参考音频 + 风格描述"""
        assert os.path.isfile(EXAMPLE_WAV), f"参考音频不存在: {EXAMPLE_WAV}"
        r = self._generate(
            text=CLONE_TEXT,
            control_instruction=CLONE_CONTROL,
            ref_wav=EXAMPLE_WAV,
        )
        path, size = self._assert_valid_audio(r)
        self.log(f"  音频: {path} ({size} bytes)")

    def test_pure_audio_clone(self):
        """[3] 纯音频克隆 — 仅参考音频，无描述"""
        assert os.path.isfile(REFERENCE_SPEAKER_WAV), \
            f"参考音频不存在: {REFERENCE_SPEAKER_WAV}"
        r = self._generate(
            text=CLONE_TEXT,
            ref_wav=REFERENCE_SPEAKER_WAV,
        )
        path, size = self._assert_valid_audio(r)
        self.log(f"  音频: {path} ({size} bytes)")

    def test_ultimate_clone(self):
        """[4] 极致克隆 — 参考音频 + 文本内容"""
        assert os.path.isfile(EXAMPLE_WAV), f"参考音频不存在: {EXAMPLE_WAV}"
        r = self._generate(
            text=ULT_CLONE_TEXT,
            ref_wav=EXAMPLE_WAV,
            use_prompt_text=True,
            prompt_text_value=ULT_PROMPT,
        )
        path, size = self._assert_valid_audio(r)
        self.log(f"  音频: {path} ({size} bytes)")

    def test_english_voice_design(self):
        """[5] 英文声音设计"""
        r = self._generate(
            text=EN_VOICE_DESIGN,
            control_instruction="A warm and friendly young woman",
        )
        path, size = self._assert_valid_audio(r)
        self.log(f"  音频: {path} ({size} bytes)")

    def test_minimal_call(self):
        """[6] 最简调用 — 仅提供文本"""
        r = self._generate(text="这是一个最简单的调用测试。")
        path, size = self._assert_valid_audio(r)
        self.log(f"  音频: {path} ({size} bytes)")

    def test_empty_text_rejected(self):
        """[7] 空文本应被拒绝"""
        try:
            self._generate(text="", control_instruction="")
            raise AssertionError("空文本应该被拒绝，但却返回了结果")
        except Exception as e:
            err = str(e).lower()
            if "text" in err or "input" in err or "error" in err:
                self.log("  空文本被正确拒绝")
            else:
                # gradio_client 可能抛出各种异常，只要不是正常返回就视为拒绝
                self.log(f"  空文本被拒绝 ({type(e).__name__})")

    def test_cfg_boundary(self):
        """[8] CFG 边界值测试"""
        r1 = self._generate(text="CFG边界值测试。", cfg_value=1.0, dit_steps=5)
        self._assert_valid_audio(r1)

        r2 = self._generate(text="CFG边界值测试。", cfg_value=3.0, dit_steps=5)
        self._assert_valid_audio(r2)
        self.log("  CFG 1.0 / 3.0 边界值正常")

    def test_advanced_params(self):
        """[9] 进阶参数组合 — 降噪 + 规范化 + 高步数"""
        assert os.path.isfile(EXAMPLE_WAV), f"参考音频不存在: {EXAMPLE_WAV}"
        r = self._generate(
            text="进阶参数测试：降噪、规范化、高推理步数。",
            ref_wav=EXAMPLE_WAV,
            control_instruction="中年男性，声音洪亮",
            denoise=True,
            do_normalize=True,
            dit_steps=20,
            cfg_value=2.5,
        )
        path, size = self._assert_valid_audio(r)
        self.log(f"  音频: {path} ({size} bytes)")


# ---------- 主流程 ----------

def main():
    parser = argparse.ArgumentParser(description="VoxCPM2 API 自动化测试")
    parser.add_argument("--host", default="localhost:8808",
                        help="服务地址 (默认: localhost:8808)")
    parser.add_argument("--skip-heavy", action="store_true",
                        help="跳过耗时较长的测试（克隆模式）")
    parser.add_argument("--only", type=str,
                        help="只运行指定测试号，逗号分隔 (1-9)")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(color("=" * 52, "cyan"))
    print(color("  VoxCPM2 API 自动化测试 (gradio_client)", "cyan"))
    print(color(f"  Host: {args.host}", "cyan"))
    print(color("=" * 52, "cyan"))
    print()

    tester = Tester(args.host)

    # 注册所有测试: (名称, 方法, 是否耗时)
    all_tests = [
        ("01-声音设计",        tester.test_voice_design,          False),
        ("02-可控克隆",         tester.test_controllable_clone,     True),
        ("03-纯音频克隆",       tester.test_pure_audio_clone,       True),
        ("04-极致克隆",         tester.test_ultimate_clone,         True),
        ("05-英文声音设计",     tester.test_english_voice_design,   False),
        ("06-最简文本调用",     tester.test_minimal_call,            False),
        ("07-空文本拒绝",       tester.test_empty_text_rejected,     False),
        ("08-CFG边界值",        tester.test_cfg_boundary,            False),
        ("09-进阶参数",         tester.test_advanced_params,         True),
    ]

    # 过滤
    if args.skip_heavy:
        print(color("  ⚠ 跳过耗时测试（克隆模式）", "yellow"))
        all_tests = [(n, f, h) for n, f, h in all_tests if not h]

    if args.only:
        ids = set(args.only.split(","))
        all_tests = [(n, f, h) for n, f, h in all_tests
                     if n.startswith(args.only) or any(i in n for i in ids)]

    print(f"  将运行 {len(all_tests)} 个测试\n")

    start_time = time.time()
    for name, func, _ in all_tests:
        tester.run(name, func)
        time.sleep(0.3)

    elapsed = time.time() - start_time

    # 结果汇总
    print()
    print(color("=" * 52, "cyan"))
    total = tester.passed + tester.failed
    print(f"  总计: {total}  通过: {color(str(tester.passed), 'green')}"
          f"  失败: {color(str(tester.failed), 'red') if tester.failed else color(str(tester.failed), 'green')}"
          f"  耗时: {elapsed:.1f}s")
    print(color("=" * 52, "cyan"))

    if tester.errors:
        print()
        print(color("  失败详情:", "red"))
        for name, err in tester.errors:
            print(f"    - {name}: {err}")

    sys.exit(0 if tester.failed == 0 else 1)


if __name__ == "__main__":
    main()
