FROM registry.cn-hangzhou.aliyuncs.com/mafgwo/python311-wkhtmltopdf:1.0

WORKDIR /app
COPY server /app/server
RUN pip install -r /app/server/requirements.txt

COPY dist /app/dist
COPY static /app/static

EXPOSE 8080

CMD [ "python", "server/app.py" ]
