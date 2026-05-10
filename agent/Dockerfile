# 使用官方 Python 3.11 镜像（轻量级 slim 版本）
FROM python:3.11-slim as builder

WORKDIR /code

# 设定 Python 环境变量，防止其生成 .pyc 字节码和启用缓冲输出以优化流式日志
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 拷贝并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 第二阶段：运行阶段
FROM python:3.11-slim

WORKDIR /code

# 拷贝第一阶段构建的依赖及程序代码
COPY --from=builder /root/.local /root/.local

# 【核心修复】将代码拷贝至 /code/agent 目录下，完美还原本地的包嵌套结构
COPY . /code/agent/

# 将编译产生的二进制路径添加到 PATH，并设定 PYTHONPATH 为 /code，使 'import agent.xxx' 导入路径在容器内完美运行
ENV PATH=/root/.local/bin:$PATH \
    PYTHONPATH=/code

# 暴露端口。Hugging Face Spaces 默认且强制要求容器向公网暴露 7860 端口
EXPOSE 7860

# 启动 FastAPI 服务 (uvicorn)，运行 agent.main 中的 app
CMD ["uvicorn", "agent.main:app", "--host", "0.0.0.0", "--port", "7860"]
