import requests
from flask import jsonify

from conf import Config
config = Config()

def gitee_token(args):
    client_id = args.get('clientId')
    code = args.get('code')
    oauth2_redirect_uri = args.get('oauth2RedirectUri')

    try:
        token_body = _fetch_gitee_token(client_id, code, oauth2_redirect_uri)
        return jsonify(token_body)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def _fetch_gitee_token(client_id, code, oauth2_redirect_uri):
    # 获取客户端密钥
    client_secrets = config.GITEE_CLIENT_SECRET.split(',')
    client_ids = config.GITEE_CLIENT_ID.split(',')
    if client_id not in client_ids:
        raise ValueError(f"Invalid client_id: {client_id}")
    client_secret = client_secrets[client_ids.index(client_id)]

    # 发起请求
    url = "https://gitee.com/oauth/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": oauth2_redirect_uri
    }

    response = requests.post(url, data=payload)
    response.raise_for_status()  # 检查请求是否成功

    body = response.json()
    token = body.get("access_token")
    if token:
        return body
    else:
        raise ValueError(f"Failed to get token. Status code: {response.status_code}, Response: {body}")
