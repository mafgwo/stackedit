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

# 授权的页面大小
AUTHORIZED_PAGE_SIZES = ["A3", "A4", "Legal", "Letter"]

# 等待 JavaScript 完成的脚本
WAIT_FOR_JAVASCRIPT_SCRIPT = """
if (window.MathJax) {
    MathJax.Hub.Register.StartupHook('HTML-CSS Jax Startup', function () {
        var htmlCss = MathJax.OutputJax['HTML-CSS'];
        htmlCss.Font.checkWebFont = function (check, font, callback) {
            if (check.time(callback)) {
                return;
            }
            if (check.total === 0) {
                htmlCss.Font.testFont(font);
                setTimeout(check, 200);
            } else {
                callback(check.STATUS.OK);
            }
        };
    });
    MathJax.Hub.Queue(function () {
        window.status = 'done';
    });
} else {
    setTimeout(function () {
        window.status = 'done';
    }, 2000);
}
"""

def generate_pdf(request):
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            file_path = tmp_file.name

        # 解析请求中的选项
        options = request.args.get('options', '{}')
        options = json.loads(options)

        # 构建 wkhtmltopdf 参数
        params = []

        # 边距
        params.extend([
            '-T', str(options.get('marginTop', 25)),
            '-R', str(options.get('marginRight', 25)),
            '-B', str(options.get('marginBottom', 25)),
            '-L', str(options.get('marginLeft', 25)),
        ])

        # 标题
        if options.get('headerCenter'):
            params.extend(['--header-center', options['headerCenter']])
        if options.get('headerLeft'):
            params.extend(['--header-left', options['headerLeft']])
        if options.get('headerRight'):
            params.extend(['--header-right', options['headerRight']])
        if options.get('headerFontName'):
            params.extend(['--header-font-name', options['headerFontName']])
        if options.get('headerFontSize'):
            params.extend(['--header-font-size', str(options['headerFontSize'])])

        # 页脚
        if options.get('footerCenter'):
            params.extend(['--footer-center', options['footerCenter']])
        if options.get('footerLeft'):
            params.extend(['--footer-left', options['footerLeft']])
        if options.get('footerRight'):
            params.extend(['--footer-right', options['footerRight']])
        if options.get('footerFontName'):
            params.extend(['--footer-font-name', options['footerFontName']])
        if options.get('footerFontSize'):
            params.extend(['--footer-font-size', str(options['footerFontSize'])])

        # 页面大小
        page_size = options.get('pageSize', 'A4')
        if page_size not in AUTHORIZED_PAGE_SIZES:
            page_size = 'A4'
        params.extend(['--page-size', page_size])

        # 添加 JavaScript 脚本
        params.extend(['--run-script', WAIT_FOR_JAVASCRIPT_SCRIPT])
        params.extend(['--window-status', 'done'])

        # 添加输入输出文件
        params.extend(['-', file_path])

        # 启动 wkhtmltopdf 子进程
        process = subprocess.Popen(
            [config.WKHTMLTOPDF_PATH] + params,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # 设置超时
        try:
            _, stderr = process.communicate(input=request.get_data().decode(), timeout=50)
        except subprocess.TimeoutExpired:
            process.kill()
            raise RequestTimeout("Request timeout.")

        if process.returncode != 0:
            raise BadRequest(stderr)

        # 发送 PDF 文件
        return Response(
            open(file_path, 'rb'),
            mimetype='application/pdf',
            headers={'Content-Disposition': 'attachment; filename=output.pdf'}
        )
    except Unauthorized as e:
        return Response(str(e), status=401, mimetype='text/plain')
    except RequestTimeout as e:
        return Response(str(e), status=408, mimetype='text/plain')
    except Exception as e:
        logger.exception(e)
        return Response(str(e), status=400, mimetype='text/plain')
    finally:
        # 删除临时文件
        if os.path.exists(file_path):
            os.remove(file_path)