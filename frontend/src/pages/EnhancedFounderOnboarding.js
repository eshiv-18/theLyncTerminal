import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  Link as LinkIcon,
  CheckCircle2,
  Shield,
  Eye,
  Users,
  BarChart3,
  Share2,
  FileText,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_MODELS = ['SaaS', 'Marketplace', 'Consumer', 'Deeptech', 'Hardware'];
const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
const SECTORS = [
  'FinTech', 'HealthTech', 'EdTech', 'E-commerce',
  'AI/ML', 'IoT', 'Logistics', 'SaaS',
];

const INTEGRATION_OPTIONS = [
  { id: 'zoho',    name: 'Zoho Books', type: 'Accounting',   required: true,  time: '2 min' },
  { id: 'stripe',  name: 'Stripe',     type: 'Payments',     required: true,  time: '2 min' },
  { id: 'hubspot', name: 'HubSpot',    type: 'CRM',          required: false, time: '3 min' },
  { id: 'github',  name: 'GitHub',     type: 'Engineering',  required: false, time: '2 min' },
];

const METRIC_TEMPLATES = [
  { source: 'MRR',          mapped: 'Monthly Recurring Revenue', value: '$42,500',  confidence: 'high',   approved: true  },
  { source: 'Cash Balance', mapped: 'Cash on Hand',              value: '$310,000', confidence: 'high',   approved: true  },
  { source: 'Pipeline',     mapped: 'Qualified Pipeline',        value: '$180,000', confidence: 'medium', approved: false },
];

const DEFAULT_SHARING = {
  revenue:         { investors: true,  internal: true,  update: true,  board: true,  dashboard: true  },
  cashBalance:     { investors: true,  internal: true,  update: true,  board: true,  dashboard: true  },
  burnRate:        { investors: true,  internal: true,  update: true,  board: true,  dashboard: false },
  productVelocity: { investors: false, internal: true,  update: true,  board: false, dashboard: false },
};

const HELPER_COPY = {
  1:  'Start by reviewing the workspace invitation and what this setup unlocks for your team.',
  2:  'These consent settings define how reporting data is shared with investors and internal users.',
  3:  'Accurate company details keep the reporting workspace aligned with your startup profile.',
  4:  'Invite teammates who should help validate metrics or collaborate on monthly updates.',
  5:  'Connecting data sources now reduces manual reporting work later.',
  6:  'Review mapped metrics so the dashboard reflects the right signals.',
  7:  'Choose which data is visible to investors, boards, and your internal workspace.',
  8:  'Preview how investors will experience your company dashboard and reporting snapshots.',
  9:  'Set the cadence, reminders, and draft generation behavior for ongoing reporting.',
  10: 'Double-check the setup summary before creating the workspace.',
};

const STEP_META = [
  { num: 1,  title: 'Welcome',          icon: Sparkles    },
  { num: 2,  title: 'Trust & Security', icon: Shield      },
  { num: 3,  title: 'Company Details',  icon: Building2   },
  { num: 4,  title: 'Team Setup',       icon: Users       },
  { num: 5,  title: 'Data Sources',     icon: LinkIcon    },
  { num: 6,  title: 'Metrics',          icon: BarChart3   },
  { num: 7,  title: 'Sharing',          icon: Share2      },
  { num: 8,  title: 'Visibility',       icon: Eye         },
  { num: 9,  title: 'Reporting',        icon: FileText    },
  { num: 10, title: 'Review',           icon: CheckCircle2 },
];

const TOTAL_STEPS = 10;

// ─── Initial form state factory (avoids stale closure on user) ────────────────
function makeInitialForm(user) {
  return {
    invitedBy:            '',
    companyName:          '',
    role:                 'Founder Admin',
    invitation_token:     '',
    understoodDataSharing: false,
    reviewedVisibility:   false,
    website:              '',
    sector:               '',
    stage:                '',
    businessModel:        '',
    hq:                   '',
    founders:             user?.name  || '',
    contactEmail:         user?.email || '',
    reportingOwner:       user?.name  || '',
    financeOwner:         '',
    reportingCadence:     'monthly',
    teamMembers:          [],
    connectedSources:     [],
    metricMappings:       METRIC_TEMPLATES,
    sharingPreferences:   DEFAULT_SHARING,
    visibilityNotes:      '',
    reportDueDate:        5,
    reminderSchedule:     '3_days',
    defaultRecipients:    [],
    boardReportFreq:      'quarterly',
    autoGenerateDrafts:   true,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
const EnhancedFounderOnboarding = () => {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();   // FIX: removed completeOnboarding — backend handles it

  const [step,           setStep]           = useState(1);
  const [loading,        setLoading]        = useState(false);
  const [isSelfReg,      setIsSelfReg]      = useState(false);
  const [teamEmail,      setTeamEmail]      = useState('');
  const [teamRole,       setTeamRole]       = useState('editor');
  const [formData,       setFormData]       = useState(() => makeInitialForm(user));

  // ── helper: partial update of formData ──────────────────────────────────────
  const patchForm = useCallback((patch) => {
    setFormData(prev => ({ ...prev, ...patch }));
  }, []);

  // ── helper: update a single sharing-preference cell ─────────────────────────
  // FIX: extracted to a stable callback so Switch renders don't create new closures
  // on every render, which was causing stale-closure crashes in step 7.
  const patchSharing = useCallback((metric, field, value) => {
    setFormData(prev => ({
      ...prev,
      sharingPreferences: {
        ...prev.sharingPreferences,
        [metric]: {
          ...prev.sharingPreferences[metric],
          [field]: value,
        },
      },
    }));
  }, []);

  // ── Load invitation on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const token = searchParams.get('token');

    const load = async () => {
      if (!token) {
        setIsSelfReg(true);
        patchForm({
          founders:      user?.name  || '',
          contactEmail:  user?.email || '',
          reportingOwner:user?.name  || '',
        });
        return;
      }

      setLoading(true);
      try {
        const res = await api.founderOnboarding.verifyInvitation(token);
        const { invitation, startup, workspace } = res.data;
        patchForm({
          invitation_token: token,
          invitedBy:        workspace?.fund_name || workspace?.name || 'VC Fund',
          companyName:      startup?.name          || '',
          website:          startup?.website       || '',
          sector:           startup?.sector        || '',
          stage:            startup?.stage         || '',
          founders:         invitation?.name       || startup?.founder_name || '',
          contactEmail:     invitation?.email      || startup?.founder_email || '',
          reportingOwner:   invitation?.name       || startup?.founder_name || '',
        });
      } catch {
        toast.error('Invalid or expired invitation link');
        setTimeout(() => navigate('/login', { replace: true }), 1500);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 2) {
      if (!formData.understoodDataSharing || !formData.reviewedVisibility) {
        toast.error('Please confirm both trust and visibility acknowledgements');
        return false;
      }
    }

    if (step === 3) {
      const { companyName, sector, stage, businessModel, founders, contactEmail } = formData;
      if (!companyName || !sector || !stage || !businessModel || !founders || !contactEmail) {
        toast.error('Please fill in all required company details');
        return false;
      }
    }

    if (step === 4) {
      const emails = formData.teamMembers.map(m => m.email);
      if (new Set(emails).size !== emails.length) {
        toast.error('Remove duplicate team member emails before continuing');
        return false;
      }
    }

    if (step === 6 && formData.metricMappings.length === 0) {
      toast.error('Please keep at least one metric mapping');
      return false;
    }

    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  // FIX: removed the `await completeOnboarding()` call.
  //   The backend /onboarding/save and /onboarding/complete already set
  //   onboarding_completed: true in the DB. Calling the AuthContext helper
  //   additionally was:
  //     a) redundant
  //     b) using the api.auth.completeOnboarding path which calls
  //        apiClient.post() — but the token may have expired during the
  //        10-step flow causing a 401 → retry → crash ("api.post is not a function"
  //        error the user was seeing)
  //   We call refreshUser() which re-fetches /api/auth/me and updates context
  //   with the now-completed onboarding flag from the DB.
  const submitOnboarding = async () => {
    const payload = {
      // snake_case for backend
      company_name:       formData.companyName,
      website:            formData.website,
      sector:             formData.sector,
      stage:              formData.stage,
      business_model:     formData.businessModel,
      hq:                 formData.hq,
      founders:           formData.founders,
      contact_email:      formData.contactEmail,
      reporting_owner:    formData.reportingOwner,
      finance_owner:      formData.financeOwner,
      reporting_cadence:  formData.reportingCadence,
      team_members:       formData.teamMembers,
      connected_sources:  formData.connectedSources,
      metric_mappings:    formData.metricMappings,
      sharing_preferences:formData.sharingPreferences,
      report_due_date:    formData.reportDueDate,
      reminder_schedule:  formData.reminderSchedule,
      default_recipients: formData.defaultRecipients,
      board_report_freq:  formData.boardReportFreq,
      auto_generate_drafts:formData.autoGenerateDrafts,
      // camelCase mirrors (some backend versions accept both)
      companyName:        formData.companyName,
      businessModel:      formData.businessModel,
      contactEmail:       formData.contactEmail,
      reportingOwner:     formData.reportingOwner,
      financeOwner:       formData.financeOwner,
      reportingCadence:   formData.reportingCadence,
      teamMembers:        formData.teamMembers,
      connectedSources:   formData.connectedSources,
      metricMappings:     formData.metricMappings,
      sharingPreferences: formData.sharingPreferences,
      reportDueDate:      formData.reportDueDate,
      reminderSchedule:   formData.reminderSchedule,
      defaultRecipients:  formData.defaultRecipients,
      boardReportFreq:    formData.boardReportFreq,
      autoGenerateDrafts: formData.autoGenerateDrafts,
    };

    if (isSelfReg) {
      await api.founderOnboarding.saveOnboarding(payload);
    } else {
      await api.founderOnboarding.completeOnboarding({
        ...payload,
        invitation_token:        formData.invitation_token,
        understood_data_sharing: formData.understoodDataSharing,
        reviewed_visibility:     formData.reviewedVisibility,
      });
    }

    // FIX: refreshUser fetches /api/auth/me which now has onboarding_completed: true
    // (set by saveOnboarding/completeOnboarding on the backend).
    // No separate completeOnboarding() call needed.
    await refreshUser();
    toast.success('Workspace setup complete!');
    navigate('/founder', { replace: true });
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (!validateStep()) return;

    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
      return;
    }

    setLoading(true);
    try {
      await submitOnboarding();
    } catch (err) {
      console.error('Onboarding submit error:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to complete onboarding';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  // ── Team helpers ─────────────────────────────────────────────────────────────
  const handleAddTeamMember = () => {
    if (!teamEmail || !teamEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (formData.teamMembers.some(m => m.email === teamEmail)) {
      toast.error('This email is already invited');
      return;
    }
    patchForm({
      teamMembers: [
        ...formData.teamMembers,
        { email: teamEmail, role: teamRole, id: Date.now() },
      ],
    });
    setTeamEmail('');
    setTeamRole('editor');
    toast.success('Team member added');
  };

  const handleRemoveTeamMember = (id) => {
    patchForm({ teamMembers: formData.teamMembers.filter(m => m.id !== id) });
  };

  // ── Metric mapping toggle ────────────────────────────────────────────────────
  const handleApproveMapping = (index) => {
    patchForm({
      metricMappings: formData.metricMappings.map((m, i) =>
        i === index ? { ...m, approved: !m.approved } : m
      ),
    });
  };

  // ── Connect integration (marks connected locally; real OAuth via /integrations) ──
  const handleConnectSource = (sourceId) => {
    if (formData.connectedSources.includes(sourceId)) return;
    patchForm({ connectedSources: [...formData.connectedSources, sourceId] });
    toast.success(`${sourceId} marked as connected — verify on the Integrations page after setup`);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP RENDERERS
  // Each step is its own function so React can clearly track them.
  // FIX: Previously all steps were inlined in renderStepContent() as a long
  // if/else chain. If any step had a runtime error, React would unmount the
  // whole content block silently (no ErrorBoundary), leaving a blank pane.
  // Splitting them also makes Switch onCheckedChange callbacks stable.
  // ─────────────────────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">
          {isSelfReg ? 'Create Your Founder Workspace' : "You're Invited"}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {isSelfReg
            ? 'We will guide you through workspace setup, data connection, and reporting preferences.'
            : `${formData.invitedBy || 'Your investor'} invited you to onboard your startup workspace.`}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Workspace</span>
            <Badge>{formData.invitedBy || 'Startup Intel'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Company</span>
            <span className="font-medium">{formData.companyName || 'To be confirmed'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Primary Contact</span>
            <span className="font-medium">{formData.contactEmail || user?.email || 'Add later'}</span>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">What you can do</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {[
              'Connect revenue, finance, and operating tools once',
              'Control exactly what investors can see',
              'Automate monthly updates and board-ready reporting',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Trust &amp; Security</h3>
        <p className="text-sm text-muted-foreground">Review what is shared and confirm visibility expectations.</p>
      </div>

      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          {[
            { title: 'Financial metrics',   desc: 'Revenue, cash, burn, and runway from your finance stack.'               },
            { title: 'GTM metrics',         desc: 'Pipeline, customer, and growth signals from sales systems.'             },
            { title: 'Workspace updates',   desc: 'Narrative notes, reporting drafts, and approved commentary.'           },
          ].map(({ title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="understoodDataSharing"
            checked={formData.understoodDataSharing}
            onCheckedChange={v => patchForm({ understoodDataSharing: v === true })}
          />
          <div>
            <Label htmlFor="understoodDataSharing" className="cursor-pointer">
              I understand what data will be shared with investors.
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              You can change visibility preferences before finishing setup.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="reviewedVisibility"
            checked={formData.reviewedVisibility}
            onCheckedChange={v => patchForm({ reviewedVisibility: v === true })}
          />
          <div>
            <Label htmlFor="reviewedVisibility" className="cursor-pointer">
              I reviewed who can access reporting activity and dashboards.
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Investor visibility and internal visibility are configured separately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Company Details</h3>
        <p className="text-sm text-muted-foreground">Review and complete your startup profile.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            value={formData.companyName}
            onChange={e => patchForm({ companyName: e.target.value })}
            className="mt-2"
            placeholder="Acme Inc."
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={e => patchForm({ website: e.target.value })}
            className="mt-2"
            placeholder="https://acme.com"
          />
        </div>

        <div>
          <Label>Sector *</Label>
          <Select value={formData.sector} onValueChange={v => patchForm({ sector: v })}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select sector" /></SelectTrigger>
            <SelectContent>
              {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Stage *</Label>
          <Select value={formData.stage} onValueChange={v => patchForm({ stage: v })}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select stage" /></SelectTrigger>
            <SelectContent>
              {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Business Model *</Label>
          <Select value={formData.businessModel} onValueChange={v => patchForm({ businessModel: v })}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent>
              {BUSINESS_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="hq">Headquarters</Label>
          <Input
            id="hq"
            value={formData.hq}
            onChange={e => patchForm({ hq: e.target.value })}
            className="mt-2"
            placeholder="Mumbai, India"
          />
        </div>

        <div>
          <Label htmlFor="founders">Founder / CEO *</Label>
          <Input
            id="founders"
            value={formData.founders}
            onChange={e => patchForm({ founders: e.target.value })}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={e => patchForm({ contactEmail: e.target.value })}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="reportingOwner">Reporting Owner</Label>
          <Input
            id="reportingOwner"
            value={formData.reportingOwner}
            onChange={e => patchForm({ reportingOwner: e.target.value })}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="financeOwner">Finance Owner</Label>
          <Input
            id="financeOwner"
            value={formData.financeOwner}
            onChange={e => patchForm({ financeOwner: e.target.value })}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Team Setup</h3>
        <p className="text-sm text-muted-foreground">
          Invite collaborators who help with monthly reporting and data review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="teamEmail">Email Address</Label>
          <Input
            id="teamEmail"
            type="email"
            value={teamEmail}
            onChange={e => setTeamEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTeamMember()}
            className="mt-2"
            placeholder="colleague@company.com"
          />
        </div>
        <div>
          <Label htmlFor="teamRole">Role</Label>
          <Select value={teamRole} onValueChange={setTeamRole}>
            <SelectTrigger className="mt-2" id="teamRole">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={handleAddTeamMember} type="button">
        <Users className="h-4 w-4 mr-2" />
        Add Team Member
      </Button>

      {formData.teamMembers.length > 0 ? (
        <div className="space-y-2">
          {formData.teamMembers.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
            >
              <div>
                <p className="text-sm font-medium">{member.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveTeamMember(member.id)}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          You can also invite teammates later from the workspace.
        </p>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Data Sources</h3>
        <p className="text-sm text-muted-foreground">
          Choose the systems you want to connect. You can complete OAuth connections after setup.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATION_OPTIONS.map(integration => {
          const connected = formData.connectedSources.includes(integration.id);
          return (
            <Card key={integration.id} className={connected ? 'border-green-400' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">{integration.type}</p>
                  </div>
                  {integration.required && <Badge variant="outline">Required</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Setup time: {integration.time}</p>
                <Button
                  variant={connected ? 'outline' : 'default'}
                  size="sm"
                  className="w-full"
                  disabled={connected}
                  onClick={() => handleConnectSource(integration.id)}
                  type="button"
                >
                  {connected
                    ? <><CheckCircle2 className="h-4 w-4 mr-2" />Connected</>
                    : <><LinkIcon className="h-4 w-4 mr-2" />Mark as connected</>}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Full OAuth connections (GitHub, Zoho) can be completed from the Integrations page after setup.
      </p>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Metrics</h3>
        <p className="text-sm text-muted-foreground">
          Review and approve the metrics that will feed your investor reporting.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source Metric</TableHead>
              <TableHead>Mapped To</TableHead>
              <TableHead>Latest Value</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="text-center">Approve</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formData.metricMappings.map((mapping, index) => (
              <TableRow key={`${mapping.source}-${index}`}>
                <TableCell className="font-medium">{mapping.source}</TableCell>
                <TableCell>{mapping.mapped}</TableCell>
                <TableCell className="font-mono">{mapping.value}</TableCell>
                <TableCell>
                  <Badge variant={mapping.confidence === 'high' ? 'default' : 'outline'}>
                    {mapping.confidence}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={mapping.approved}
                    onCheckedChange={() => handleApproveMapping(index)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // FIX: Sharing step extracted. Each Switch uses the stable patchSharing callback
  // instead of an inline arrow function that re-creates on every render.
  // This was the main cause of blank step 7 — the inline closures captured stale
  // formData.sharingPreferences and in some builds caused a render loop / crash.
  const renderStep7 = () => {
    const fields = ['investors', 'internal', 'update', 'board', 'dashboard'];
    const metricLabels = {
      revenue:         'Revenue',
      cashBalance:     'Cash Balance',
      burnRate:        'Burn Rate',
      productVelocity: 'Product Velocity',
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Sharing</h3>
          <p className="text-sm text-muted-foreground">Set who can see each category of data.</p>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                {fields.map(f => (
                  <TableHead key={f} className="text-center capitalize">{f}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(formData.sharingPreferences).map(([key, prefs]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {metricLabels[key] || key}
                  </TableCell>
                  {fields.map(field => (
                    <TableCell key={field} className="text-center">
                      {/* FIX: use stable patchSharing instead of inline closure */}
                      <Switch
                        checked={!!prefs[field]}
                        onCheckedChange={v => patchSharing(key, field, v)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderStep8 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Visibility</h3>
        <p className="text-sm text-muted-foreground">
          Add context for any private notes or special visibility instructions.
        </p>
      </div>

      <div className="border rounded-lg p-6 bg-muted/20 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Monthly Revenue', value: '$42.5K', sub: 'Healthy growth',        subClass: 'text-green-500' },
            { label: 'Cash Runway',     value: '11 mo',  sub: 'Based on current burn', subClass: 'text-muted-foreground' },
            { label: 'Pipeline',        value: '$180K',  sub: 'Tracked from CRM',      subClass: 'text-green-500' },
          ].map(({ label, value, sub, subClass }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
                <p className={`text-xs ${subClass}`}>{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Textarea
          value={formData.visibilityNotes}
          onChange={e => patchForm({ visibilityNotes: e.target.value })}
          placeholder="Add any notes about what should stay internal or how investors should interpret this dashboard."
          rows={4}
        />
      </div>
    </div>
  );

  const renderStep9 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Reporting</h3>
        <p className="text-sm text-muted-foreground">
          Configure when reports are due and how drafts should be prepared.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="reportDueDate">Monthly Report Due Date</Label>
          <Select
            value={String(formData.reportDueDate)}
            onValueChange={v => patchForm({ reportDueDate: parseInt(v, 10) })}
          >
            <SelectTrigger className="mt-2" id="reportDueDate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 5, 10, 15, 20].map(d => (
                <SelectItem key={d} value={String(d)}>Day {d} of each month</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="reminderSchedule">Reminder Schedule</Label>
          <Select
            value={formData.reminderSchedule}
            onValueChange={v => patchForm({ reminderSchedule: v })}
          >
            <SelectTrigger className="mt-2" id="reminderSchedule">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1_day">1 day before</SelectItem>
              <SelectItem value="3_days">3 days before</SelectItem>
              <SelectItem value="1_week">1 week before</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="boardReportFreq">Board Report Frequency</Label>
          <Select
            value={formData.boardReportFreq}
            onValueChange={v => patchForm({ boardReportFreq: v })}
          >
            <SelectTrigger className="mt-2" id="boardReportFreq">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="text-sm font-medium">Auto-generate draft reports</p>
            <p className="text-xs text-muted-foreground">
              We will prepare a first draft using synced metrics and workspace activity.
            </p>
          </div>
          <Switch
            checked={formData.autoGenerateDrafts}
            onCheckedChange={v => patchForm({ autoGenerateDrafts: v })}
          />
        </div>
      </div>
    </div>
  );

  const renderStep10 = () => (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-semibold">Review Your Setup</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Everything below will be used to create your founder workspace.
        </p>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="p-6 space-y-4">
          {[
            { label: 'Company',           value: formData.companyName || 'Not set'                                              },
            { label: 'Sector / Stage',    value: [formData.sector, formData.stage].filter(Boolean).join(' · ') || 'Not set'    },
            { label: 'Contact Email',     value: formData.contactEmail || 'Not set'                                             },
            { label: 'Team Members',      value: formData.teamMembers.length                                                    },
            { label: 'Connected Sources', value: formData.connectedSources.length                                               },
            { label: 'Approved Metrics',  value: formData.metricMappings.filter(m => m.approved).length                        },
            { label: 'Report Due Date',   value: `Day ${formData.reportDueDate} of each month`                                 },
            { label: 'Board Reports',     value: formData.boardReportFreq                                                       },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="font-medium text-sm">{label}</span>
              <span className="text-sm text-muted-foreground">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  // ── Step dispatcher ───────────────────────────────────────────────────────────
  const STEP_RENDERERS = {
    1:  renderStep1,
    2:  renderStep2,
    3:  renderStep3,
    4:  renderStep4,
    5:  renderStep5,
    6:  renderStep6,
    7:  renderStep7,
    8:  renderStep8,
    9:  renderStep9,
    10: renderStep10,
  };

  const renderCurrentStep = () => {
    const renderer = STEP_RENDERERS[step];
    if (!renderer) return null;
    try {
      return renderer();
    } catch (err) {
      // FIX: Catch render errors per-step instead of letting them silently blank
      // the entire CardContent. Show an error message in place of the step.
      console.error(`Step ${step} render error:`, err);
      return (
        <div className="p-6 text-center space-y-2">
          <p className="text-sm text-red-500 font-medium">Something went wrong rendering this step.</p>
          <p className="text-xs text-muted-foreground">{err?.message}</p>
          <Button variant="outline" size="sm" onClick={() => setStep(s => s)}>Retry</Button>
        </div>
      );
    }
  };

  const currentMeta = STEP_META[step - 1];
  const StepIcon    = currentMeta.icon;
  const progress    = (step / TOTAL_STEPS) * 100;

  // ─────────────────────────────────────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Founder Onboarding</h1>
              <p className="text-sm text-muted-foreground">Set up your workspace and start reporting</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Step {step} of {TOTAL_STEPS}</span>
              <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* ── Body grid ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {STEP_META.map(item => {
                    const Icon      = item.icon;
                    const isActive  = item.num === step;
                    const isComplete= item.num < step;
                    return (
                      <div
                        key={item.num}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isActive   ? 'bg-primary/10 border border-primary'
                          : isComplete ? 'bg-green-500/10'
                          : 'bg-muted/50'
                        }`}
                      >
                        <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                          isActive   ? 'bg-primary text-primary-foreground'
                          : isComplete ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                          {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <p className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Why This Matters
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {HELPER_COPY[step]}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main card */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StepIcon className="h-5 w-5" />
                  {currentMeta.title}
                </CardTitle>
              </CardHeader>

              {/* FIX: Added overflow-y-auto + max-h so tall steps (6, 7) scroll
                  instead of being clipped by a parent container. */}
              <CardContent className="space-y-6 overflow-y-auto max-h-[60vh] md:max-h-none">
                {renderCurrentStep()}

                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={step === 1 || loading}
                    type="button"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>

                  <Button onClick={handleNext} disabled={loading} type="button">
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
                    ) : step === TOTAL_STEPS ? (
                      <><CheckCircle2 className="h-4 w-4 mr-2" />Complete Setup</>
                    ) : (
                      <>Next<ArrowRight className="h-4 w-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFounderOnboarding;