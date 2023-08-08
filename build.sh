docker build -t mafgwo/stackedit .
docker tag mafgwo/stackedit mafgwo/stackedit:$1 .
docker tag mafgwo/stackedit registry.cn-hangzhou.aliyuncs.com/mafgwo/stackedit
docker tag mafgwo/stackedit registry.cn-hangzhou.aliyuncs.com/mafgwo/stackedit:$1
docker push mafgwo/stackedit
docker push registry.cn-hangzhou.aliyuncs.com/mafgwo/stackedit
docker push mafgwo/stackedit:$1
docker push registry.cn-hangzhou.aliyuncs.com/mafgwo/stackedit:$1