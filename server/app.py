import os
import random
from flask import Flask, request, send_from_directory, jsonify, redirect, url_for
from flask_cors import CORS
from flask_compress import Compress

app = Flask(__name__, static_folder='dist')
Compress(app)

from conf import Config
config = Config()

# 配置静态文件路径
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
print(STATIC_DIR)
print(DIST_DIR)

# OAuth2 令牌路由
@app.route('/oauth2/githubToken', methods=['GET'])
def github_token():
    from github import github_token
    return github_token(request.args)

@app.route('/oauth2/giteeToken', methods=['GET'])
def gitee_token():
    from gitee import gitee_token
    return gitee_token(request.args)

@app.route('/oauth2/giteaToken', methods=['GET'])
def gitea_token():
    from gitea import gitea_token
    return gitea_token(request.args)

@app.route('/oauth2/gitlabToken', methods=['GET'])
def gitlab_token():
    from gitlab import gitlab_token
    return gitlab_token(request.args)

# 配置路由
@app.route('/conf', methods=['GET'])
def conf():
    return jsonify(config.public_values())

@app.route('/pdfExport', methods=['POST'])
def pdf_export():
    from pdf import generate_pdf
    return generate_pdf(request)

@app.route('/pandocExport', methods=['POST'])
def pandoc_export():
    from pandoc import generate_pandoc
    return generate_pandoc(request)

@app.route('/giteeClientId', methods=['GET'])
def gitee_client_id():
    client_ids = config.GITEE_CLIENT_ID.split(',')
    if len(client_ids) == 1:
        return client_ids[0]
    random_choice = request.args.get('random')
    if random_choice:
        return random.choice(client_ids[1:])
    return client_ids[0]

# 静态文件服务
@app.route('/')
def landing():
    return send_from_directory(os.path.join(STATIC_DIR, 'landing'), 'index.html')

@app.route('/privacy_policy.html')
def privacy_policy():
    return send_from_directory(os.path.join(STATIC_DIR, 'landing'), 'privacy_policy.html')

@app.route('/sitemap.xml')
def sitemap():
    return send_from_directory(STATIC_DIR, 'sitemap.xml')

@app.route('/oauth2/callback')
def oauth2_callback():
    return send_from_directory(os.path.join(STATIC_DIR, 'oauth2'), 'callback.html')

@app.route('/googleDriveAction')
def google_drive_action():
    state = request.args.get('state', '')
    return redirect(f"./app#providerId=googleDrive&state={state}")

@app.route('/themes/<path:filename>')
def themes(filename):
    return send_from_directory(os.path.join(STATIC_DIR, 'themes'), filename)

@app.route('/style.css')
def style_css():
    return send_from_directory(DIST_DIR, 'style.css', max_age=86400)

@app.route('/share.html')
def share():
    return send_from_directory(os.path.join(STATIC_DIR, 'landing'), 'share.html')

@app.route('/gistshare.html')
def gistshare():
    return send_from_directory(os.path.join(STATIC_DIR, 'landing'), 'gistshare.html')

# 生产环境下的静态文件服务
@app.route('/app')
def app_index():
    return send_from_directory(DIST_DIR, 'index.html')

@app.route('/static/landing/<path:fallback>')
def static_landing_files(fallback):
    print(fallback)
    return send_from_directory(os.path.join(STATIC_DIR, 'landing'), fallback, max_age=86400)

@app.route('/static/<path:fallback>')
def static_files(fallback):
    print(fallback)
    return send_from_directory(os.path.join(DIST_DIR, 'static'), fallback, max_age=31536000)

@app.route('/<path:fallback>')
def dist_files(fallback):
    print(fallback)
    return send_from_directory(DIST_DIR, fallback)

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)