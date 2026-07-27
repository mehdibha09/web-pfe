package com.deployment.ServiceEntity.domain;

public class VagrantSshConfig {

    private String host = "127.0.0.1";
    private int port = 2222;
    private String user = "vagrant";
    private String privateKeyPath;

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getPrivateKeyPath() {
        return privateKeyPath;
    }

    public void setPrivateKeyPath(String path) {
        this.privateKeyPath = path;
    }
}