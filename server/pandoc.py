import os
import json
import tempfile
import subprocess
from flask import Response
from werkzeug.exceptions import BadRequest, Unauthorized, RequestTimeout
import logging

# 假设配置文件 conf.py 已经定义了 Config 类
from conf import Config
config = Config()

logger = logging.getLogger(__file__)

# 输出格式及其 MIME 类型
OUTPUT_FORMATS = {
    "asciidoc": "text/plain",
    "context": "application/x-latex",
    "epub": "application/epub+zip",
    "epub3": "application/epub+zip",
    "latex": "application/x-latex",
    "odt": "application/vnd.oasis.opendocument.text",
    "pdf": "application/pdf",
    "rst": "text/plain",
    "rtf": "application/rtf",
    "textile": "text/plain",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

# 高亮样式列表
HIGHLIGHT_STYLES = [
    "pygments",
    "kate",
    "monochrome",
    "espresso",
    "zenburn",
    "haddock",
    "tango",
]

def read_json(str_data):
    try:
        return json.loads(str_data)
    except json.JSONDecodeError:
        return {}

def generate_pandoc(request):
    try:
        # 获取请求参数
        output_format = request.args.get("format", "pdf")
        if output_format not in OUTPUT_FORMATS:
            output_format = "pdf"

        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{output_format}") as tmp_file:
            file_path = tmp_file.name

        # 解析请求中的选项和元数据
        options = read_json(request.args.get("options", "{}"))
        metadata = read_json(request.args.get("metadata", "{}"))

        # 构建 Pandoc 参数
        params = [
            config.PANDOC_PATH,
            "--pdf-engine=xelatex",
        ]

        if options.get("toc"):
            params.append("--toc")

        toc_depth = options.get("tocDepth")
        if toc_depth and isinstance(toc_depth, int):
            params.extend(["--toc-depth", str(toc_depth)])

        highlight_style = options.get("highlightStyle", "kate")
        if highlight_style in HIGHLIGHT_STYLES:
            params.extend(["--highlight-style", highlight_style])

        for key, value in metadata.items():
            params.extend(["-M", f"{key}={value}"])

        # 设置输入输出格式
        params.extend(["-f", "json", "-t", "latex" if output_format == "pdf" else output_format])
        params.extend(["-o", file_path])

        # 启动 Pandoc 子进程
        process = subprocess.Popen(
            params,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # 设置超时
        try:
            _, stderr = process.communicate(input=request.get_data(as_text=True), timeout=50)
        except subprocess.TimeoutExpired:
            process.kill()
            raise RequestTimeout("Request timeout.")

        if process.returncode != 0:
            raise BadRequest(stderr)

        # 发送生成的文件
        return Response(
            open(file_path, "rb"),
            mimetype=OUTPUT_FORMATS[output_format],
            headers={"Content-Disposition": f"attachment; filename=output.{output_format}"}
        )
    except Unauthorized as e:
        return Response(str(e), status=401, mimetype="text/plain")
    except RequestTimeout as e:
        return Response(str(e), status=408, mimetype="text/plain")
    except Exception as e:
        return Response(str(e), status=400, mimetype="text/plain")
    finally:
        # 删除临时文件
        if os.path.exists(file_path):
            os.remove(file_path)
