FROM registry.cn-hangzhou.aliyuncs.com/mafgwo/python311-wkhtmltopdf:1.0

WORKDIR /app
COPY server /app/server
RUN pip install -r /app/server/requirements.txt --index-url https://pypi.tuna.tsinghua.edu.cn/simple

COPY dist /app/dist
COPY static /app/static
COPY node_modules/prismjs/components /app/node_modules/prismjs/components

ENV DEBUG_FLAG=false

EXPOSE 8080

CMD [ "python", "server/app.py" ]
