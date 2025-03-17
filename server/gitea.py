import os
import requests
from flask import jsonify

from conf import Config

config = Config()

def gitea_token(args):
    query_params = args.to_dict()
    try:
        token_body = _fetch_gitea_token(query_params)
        return jsonify(token_body)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def _fetch_gitea_token(query_param):
    url = f"{config.GITEA_URL}/login/oauth/access_token"
    payload = {
        **query_param,
        "client_id": config.GITEA_CLIENT_ID,
        "client_secret": config.GITEA_CLIENT_SECRET,
    }

    headers = {
        "Content-Type": "application/json",
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()  # 检查请求是否成功

    body = response.json()
    token = body.get("access_token")
    if token:
        return body
    else:
        raise ValueError(f"Failed to get token. Status code: {response.status_code}, Response: {body}")
