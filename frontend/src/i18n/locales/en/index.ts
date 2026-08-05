import admin from './admin.json';
import alerts from './alerts.json';
import appBar from './appBar.json';
import auth from './auth.json';
import backups from './backups.json';
import common from './common.json';
import costs from './costs.json';
import dashboard from './dashboard.json';
import deployments from './deployments.json';
import environments from './environments.json';
import errors from './errors.json';
import k8s from './k8s.json';
import layout from './layout.json';
import metrics from './metrics.json';
import monitoring from './monitoring.json';
import nav from './nav.json';
import notifications from './notifications.json';
import periods from './periods.json';
import profile from './profile.json';
import quotas from './quotas.json';
import serviceEnvs from './serviceEnvs.json';
import services from './services.json';
import validation from './validation.json';
import vms from './vms.json';

export default {
    ...nav,
    ...auth,
    ...common,
    ...admin,
    ...layout,
    ...errors,
    ...appBar,
    ...monitoring,
    ...validation,
    ...profile,
    ...alerts,
    ...backups,
    ...costs,
    ...deployments,
    ...environments,
    ...quotas,
    ...periods,
    ...metrics,
    ...services,
    ...serviceEnvs,
    ...vms,
    ...notifications,
    ...k8s,
    ...dashboard
};
