import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import type { DeploymentResponse, EnvironmentResponse, ServiceResponse } from '../../../services/devopsService';
import { C} from '../../../theme/tokens';

interface EnvironmentsSectionProps {
    environments: EnvironmentResponse[];
    deployments: DeploymentResponse[];
    services: ServiceResponse[];
}

const EnvironmentsSection = ({ environments, deployments, services }: EnvironmentsSectionProps) => (
    <Card sx={{ borderRadius: 3, border: '1px solid #F5D8E4' }}>
        <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: C.text, mb: 0.5 }}>
                Environments
            </Typography>
            <Typography sx={{ color: C.muted, fontSize: 13, mb: 2 }}>
                Infrastructure status overview
            </Typography>
            <Divider sx={{ mb: 2, borderColor: '#F5D8E4' }} />
            {environments.length === 0 ? (
                <Typography sx={{ color: C.subtle, textAlign: 'center', py: 4 }}>
                    No environments configured
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {environments.map((env) => {
                        const envDeployments = deployments.filter((d) => d.serviceEnvironmentId);
                        const envServices = services.filter((s) => s.tenantId === env.tenantId);
                        return (
                            <Box
                                key={env.id}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    border: '1px solid #F5D8E4',
                                    backgroundColor: '#FFFFFF'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography sx={{ fontWeight: 800, color: C.text, fontSize: 14 }}>
                                        {env.name}
                                    </Typography>
                                    <CheckCircleIcon sx={{ color: '#2E7A4F', fontSize: 18 }} />
                                </Box>
                                <Typography sx={{ color: C.muted, fontSize: 12, mt: 0.5 }}>
                                    {env.description || 'No description'}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                    <Typography sx={{ fontSize: 11, color: C.muted }}>
                                        <strong>{envServices.length}</strong> services
                                    </Typography>
                                    <Typography sx={{ fontSize: 11, color: C.muted }}>
                                        <strong>{envDeployments.length}</strong> deployments
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </CardContent>
    </Card>
);

export default EnvironmentsSection;
