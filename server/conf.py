import os

class Config:
    # 类变量，用于存储环境变量的值
    PANDOC_PATH = os.getenv("PANDOC_PATH", "pandoc")
    WKHTMLTOPDF_PATH = os.getenv("WKHTMLTOPDF_PATH", "wkhtmltopdf")
    PAYPAL_RECEIVER_EMAIL = os.getenv("PAYPAL_RECEIVER_EMAIL")

    DROPBOX_APP_KEY = os.getenv("DROPBOX_APP_KEY")
    DROPBOX_APP_KEY_FULL = os.getenv("DROPBOX_APP_KEY_FULL")
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
    GITEE_CLIENT_ID = os.getenv("GITEE_CLIENT_ID")
    GITEE_CLIENT_SECRET = os.getenv("GITEE_CLIENT_SECRET")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    WORDPRESS_CLIENT_ID = os.getenv("WORDPRESS_CLIENT_ID")
    GITEA_CLIENT_ID = os.getenv("GITEA_CLIENT_ID")
    GITEA_CLIENT_SECRET = os.getenv("GITEA_CLIENT_SECRET")
    GITEA_URL = os.getenv("GITEA_URL")
    GITLAB_CLIENT_ID = os.getenv("GITLAB_CLIENT_ID")
    GITLAB_CLIENT_SECRET = os.getenv("GITLAB_CLIENT_SECRET")
    GITLAB_URL = os.getenv("GITLAB_URL")

    @classmethod
    def values(cls):
        return {
            "pandocPath": cls.PANDOC_PATH,
            "wkhtmltopdfPath": cls.WKHTMLTOPDF_PATH,
            "paypalReceiverEmail": cls.PAYPAL_RECEIVER_EMAIL,
            "dropboxAppKey": cls.DROPBOX_APP_KEY,
            "dropboxAppKeyFull": cls.DROPBOX_APP_KEY_FULL,
            "githubClientId": cls.GITHUB_CLIENT_ID,
            "githubClientSecret": cls.GITHUB_CLIENT_SECRET,
            "giteeClientId": cls.GITEE_CLIENT_ID,
            "giteeClientSecret": cls.GITEE_CLIENT_SECRET,
            "googleClientId": cls.GOOGLE_CLIENT_ID,
            "googleApiKey": cls.GOOGLE_API_KEY,
            "wordpressClientId": cls.WORDPRESS_CLIENT_ID,
            "giteaClientId": cls.GITEA_CLIENT_ID,
            "giteaClientSecret": cls.GITEA_CLIENT_SECRET,
            "giteaUrl": cls.GITEA_URL,
            "gitlabClientId": cls.GITLAB_CLIENT_ID,
            "gitlabClientSecret": cls.GITLAB_CLIENT_SECRET,
            "gitlabUrl": cls.GITLAB_URL,
        }

    @classmethod
    def public_values(cls):
        return {
            "dropboxAppKey": cls.DROPBOX_APP_KEY,
            "dropboxAppKeyFull": cls.DROPBOX_APP_KEY_FULL,
            "githubClientId": cls.GITHUB_CLIENT_ID,
            "googleClientId": cls.GOOGLE_CLIENT_ID,
            "googleApiKey": cls.GOOGLE_API_KEY,
            "wordpressClientId": cls.WORDPRESS_CLIENT_ID,
            "allowSponsorship": bool(cls.PAYPAL_RECEIVER_EMAIL),
            "giteaClientId": cls.GITEA_CLIENT_ID,
            "giteaUrl": cls.GITEA_URL,
            "gitlabClientId": cls.GITLAB_CLIENT_ID,
            "gitlabUrl": cls.GITLAB_URL,
        }