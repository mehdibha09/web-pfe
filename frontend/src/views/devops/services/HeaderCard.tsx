import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import type { ServiceResponse } from '../../../services/devopsService';
import { C} from '../../../theme/tokens';

type HeaderCardProps = {
    services: ServiceResponse[];
};

const HeaderCard = ({ services }: HeaderCardProps) => {
    const activeCount = services.filter((s) => s.status === 'ACTIVE').length;
    const pendingCount = services.filter((s) => s.status === 'PENDING').length;
    const disabledCount = services.filter((s) => s.status === 'DISABLED').length;

    return (
        <Card
            sx={{
                borderRadius: 4,
                backgroundColor: '#FFFFFF',
                mb: 3,
                background: 'linear-gradient(135deg, #F8F5FA 0%, #FFFFFF 100%)',
                color: C.text
            }}
        >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexDirection: { xs: 'column', md: 'row' }
                    }}
                >
                    <Box>
                        <Chip
                            label="DevOps services"
                            sx={{
                                mb: 2,
                                backgroundColor: C.brandLight,
                                color: C.brand,
                                fontWeight: 700
                            }}
                        />
                        <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                            Services registry
                        </Typography>
                        <Typography sx={{ mt: 1, color: C.muted, maxWidth: 760 }}>
                            Manage tenant services with a cleaner overview, better spacing and a more polished
                            workflow.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 1.5,
                            width: { xs: '100%', md: 420 }
                        }}
                    >
                        {[
                            { label: 'Total', value: services.length },
                            { label: 'Active', value: activeCount },
                            { label: 'Pending', value: pendingCount + disabledCount }
                        ].map((s) => (
                            <Box
                                key={s.label}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 3,
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #F5D8E4'
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: C.muted,
                                        fontSize: 12,
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {s.label}
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                                    {s.value}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default HeaderCard;
