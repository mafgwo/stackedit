import requests
from flask import jsonify

from conf import Config
config = Config()

def github_token(args):
    client_id = args.get('clientId')
    code = args.get('code')

    try:
        token = _fetch_github_token(client_id, code)
        return token
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def _fetch_github_token(client_id, code):
    url = "https://github.com/login/oauth/access_token"
    params = {
        "client_id": client_id,
        "client_secret": config.GITHUB_CLIENT_SECRET,
        "code": code,
    }

    headers = {
        "Accept": "application/json"
    }

    response = requests.post(url, params=params, headers=headers)
    response.raise_for_status()  # 检查请求是否成功

    body = response.json()
    token = body.get("access_token")
    if token:
        return token
    else:
        raise ValueError(f"Failed to get token. Status code: {response.status_code}, Response: {body}")
