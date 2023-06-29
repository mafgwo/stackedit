docker build -t mafgwo/stackedit:$1 .
docker tag mafgwo/stackedit:$1 registry.cn-hangzhou.aliyuncs.com/mafgwo/stackedit:$1
docker push mafgwo/stackedit:$1
docker push registry.cn-hangzhou.aliyuncs.com/mafgwo/stackedit:$1