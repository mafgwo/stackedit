#!/bin/bash

# 检查参数是否提供版本号
if [ -z "$1" ]; then
  echo "请提供版本号作为参数"
  exit 1
fi

# 定义版本号变量
VERSION="$1"
IMAGE_NAME="mafgwo/stackedit"

# 构建 Docker 镜像
build_image() {
  docker build -t "$IMAGE_NAME" .
}

# 标记 Docker 镜像
tag_image() {
  docker tag "$IMAGE_NAME" "$IMAGE_NAME:$VERSION"
  docker tag "$IMAGE_NAME" "registry.cn-hangzhou.aliyuncs.com/$IMAGE_NAME:$VERSION"
}

# 推送 Docker 镜像
push_image() {
  docker push "$IMAGE_NAME"
  docker push "registry.cn-hangzhou.aliyuncs.com/$IMAGE_NAME"
  docker push "$IMAGE_NAME:$VERSION"
  docker push "registry.cn-hangzhou.aliyuncs.com/$IMAGE_NAME:$VERSION"
}

# 执行构建、标记和推送
build_image
tag_image
push_image

echo "操作完成"