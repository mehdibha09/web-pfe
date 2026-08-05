package com.deployment.ServiceEntity.web.routes;

public final class ApiRoutes {
  private ApiRoutes() {
  }

  public static final String API_V1 = "/api/v1";

  public static final class Test {
    private Test() {
    }

    public static final String BASE = API_V1 + "/test";
  }

  public static final class Environment {
    private Environment() {
    }

    public static final String BASE = API_V1 + "/environments";
  }

  public static final class Metric {
    private Metric() {
    }

    public static final String BASE = API_V1 + "/metrics";
  }

  public static final class History {
    private History() {
    }

    public static final String BASE = API_V1 + "/history";
  }

  public static final class ServiceApi {
    private ServiceApi() {
    }

    public static final String BASE = API_V1 + "/services";
  }

  public static final class ServiceEnvironment {
    private ServiceEnvironment() {
    }

    public static final String BASE = API_V1 + "/service-environments";
  }

  public static final class Vm {
    private Vm() {
    }

    public static final String BASE = API_V1 + "/vms";
  }

  public static final class Backup {
    private Backup() {
    }

    public static final String BASE = API_V1 + "/backups";
  }

  public static final class K8s {
    private K8s() {
    }

    public static final String BASE = API_V1 + "/k8s/deployments";
  }

  public static final class K8sNetworkPolicy {
    private K8sNetworkPolicy() {
    }

    public static final String BASE = API_V1 + "/k8s/network-policies";
  }

  public static final class DeploymentTemplate {
    private DeploymentTemplate() {
    }

    public static final String BASE = API_V1 + "/deployment-templates";
  }

  public static final class K8sConfigMap {
    private K8sConfigMap() {}

    public static final String BASE = API_V1 + "/k8s/configmaps";
  }

  public static final class K8sServiceAccount {
    private K8sServiceAccount() {}

    public static final String BASE = API_V1 + "/k8s/serviceaccounts";
  }

  public static final class K8sRole {
    private K8sRole() {}

    public static final String BASE = API_V1 + "/k8s/roles";
  }

  public static final class K8sRoleBinding {
    private K8sRoleBinding() {}

    public static final String BASE = API_V1 + "/k8s/rolebindings";
  }

  public static final class K8sSecret {
    private K8sSecret() {}

    public static final String BASE = API_V1 + "/k8s/secrets";
  }

  public static final class K8sNamespace {
    private K8sNamespace() {}

    public static final String BASE = API_V1 + "/k8s/namespaces";
  }

  public static final class K8sService {
    private K8sService() {}

    public static final String BASE = API_V1 + "/k8s/services";
  }

  public static final class K8sIngress {
    private K8sIngress() {}

    public static final String BASE = API_V1 + "/k8s/ingresses";
  }

  public static final class Notification {
    private Notification() {
    }

    public static final String BASE = API_V1 + "/notifications";
  }

}
