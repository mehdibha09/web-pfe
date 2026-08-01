import { AccountTree, Description, Dns, Lock, Security, Shield, Storage, Lan, Http } from '@mui/icons-material';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { C } from '../../../theme/tokens';
import { getStoredUser } from '../../../services/authStorage';
import { canManageNamespaces } from '../../../services/authorization';
import ConfigMapsPage from './ConfigMapsPage';
import IngressPage from './IngressPage';
import K8sDeploymentsPage from './K8sDeploymentsPage';
import NamespacesPage from './NamespacesPage';
import NetworkPoliciesPage from './NetworkPoliciesPage';
import RbacPage from './RbacPage';
import SecretsPage from './SecretsPage';
import ServicesPage from './ServicesPage';
import TemplatesPage from './TemplatesPage';

const K8sPage = () => {
    const { t } = useTranslation();
    const [tab, setTab] = useState(0);

    const user = getStoredUser();
    const showNamespaces = user ? canManageNamespaces(user) : false;

    const tabs = useMemo(() => {
        const all = [
            { label: 'Namespaces', icon: <Dns sx={{ fontSize: 18 }} />, component: <NamespacesPage /> },
            { label: 'Services', icon: <Lan sx={{ fontSize: 18 }} />, component: <ServicesPage /> },
            { label: 'Ingress', icon: <Http sx={{ fontSize: 18 }} />, component: <IngressPage /> },
            { label: 'Deployments', icon: <AccountTree sx={{ fontSize: 18 }} />, component: <K8sDeploymentsPage /> },
            { label: 'ConfigMaps', icon: <Storage sx={{ fontSize: 18 }} />, component: <ConfigMapsPage /> },
            { label: 'Secrets', icon: <Lock sx={{ fontSize: 18 }} />, component: <SecretsPage /> },
            { label: 'Network Policies', icon: <Shield sx={{ fontSize: 18 }} />, component: <NetworkPoliciesPage /> },
            { label: 'RBAC', icon: <Security sx={{ fontSize: 18 }} />, component: <RbacPage /> },
            { label: 'Templates', icon: <Description sx={{ fontSize: 18 }} />, component: <TemplatesPage /> },
        ];
        return showNamespaces ? all : all.slice(1);
    }, [showNamespaces]);

    const activeTab = tab < tabs.length ? tab : 0;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: `1px solid ${C.border}`, backgroundColor: '#fff', px: 3, pt: 2, pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(228,71,125,0.3)' }}>
                        <AccountTree sx={{ color: '#fff', fontSize: 18 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, lineHeight: 1.2 }}>Kubernetes</Typography>
                        <Typography sx={{ color: C.muted, fontSize: 12 }}>Manage deployments, configmaps, network policies, RBAC & templates</Typography>
                    </Box>
                </Box>
                <Tabs value={activeTab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13, minHeight: 40, py: 0.5 }, '& .Mui-selected': { color: `${C.brand} !important` }, '& .MuiTabs-indicator': { backgroundColor: C.brand } }}>
                    {tabs.map((t, i) => <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />)}
                </Tabs>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {tabs[activeTab].component}
            </Box>
        </Box>
    );
};

export default K8sPage;
