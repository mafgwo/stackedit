import requests
from flask import jsonify

from conf import Config

config = Config()


def gitcode_token(args):
    try:
        token_body = _fetch_gitcode_token(args)
        return jsonify(token_body)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _fetch_gitcode_token(query_params):
    url = "https://gitcode.com/oauth/token"
    grant_type = query_params.get("grant_type", "authorization_code")

    params = {
        "grant_type": grant_type,
    }
    body = None

    if grant_type == "refresh_token":
        params["refresh_token"] = query_params.get("refresh_token")
    else:
        params["code"] = query_params.get("code")
        params["client_id"] = config.GITCODE_CLIENT_ID
        params["client_secret"] = config.GITCODE_CLIENT_SECRET

    response = requests.post(url, params=params, timeout=10)
    body = response.json()
    token = body.get("access_token")
    if token:
        return body
    raise ValueError(f"Failed to get token. Status code: {response.status_code}, Response: {body}")
