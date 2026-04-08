import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Building2,
  Users,
  Upload,
  Settings,
  Target,
  Rocket,
  UserPlus,
  FileSpreadsheet,
  Mail,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const AdminOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 6;
  
  const [formData, setFormData] = useState({
    // Step 1 - Welcome
    orgName: '',
    userName: '',
    email: '',
    country: '',
    useCase: '',
    
    // Step 2 - Workspace
    fundName: '',
    logo: null,
    currency: 'USD',
    reportingFrequency: 'monthly',
    timezone: 'UTC',
    portfolioUnit: 'fund',
    investmentStages: [],
    sectors: [],
    
    // Step 3 - Team
    teamMembers: [],
    
    // Step 4 - Portfolio
    companies: [],
    
    // Step 5 - Founder Invites
    founderInvites: {},
    
    // Step 6 - Metrics
    healthScoreTemplate: 'balanced',
    runwayThreshold: 9,
    requiredSections: ['financial', 'gtm', 'product'],
    mandatoryMetrics: true,
    alertRecipients: ['admin', 'partners'],
    founderCanEdit: true
  });

  const progress = (step / totalSteps) * 100;

  const steps = [
    { num: 1, title: 'Welcome', icon: Rocket },
    { num: 2, title: 'Workspace', icon: Building2 },
    { num: 3, title: 'Team Setup', icon: Users },
    { num: 4, title: 'Portfolio', icon: Target },
    { num: 5, title: 'Founder Invites', icon: Mail },
    { num: 6, title: 'Rules & Metrics', icon: Settings }
  ];

  const handleNext = () => {
    // Validate current step
    if (step === 1 && (!formData.orgName || !formData.email)) {
      toast.error('Please fill required fields');
      return;
    }
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      toast.success('Workspace setup complete!', {
        description: 'Landing you on your portfolio command center'
      });
      setTimeout(() => navigate('/admin'), 1500);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        {
          id: Date.now(),
          name: '',
          email: '',
          role: 'analyst',
          accessScope: 'all',
          status: 'pending'
        }
      ]
    }));
  };

  const handleRemoveTeamMember = (id) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m.id !== id)
    }));
  };

  const handleAddCompany = () => {
    setFormData(prev => ({
      ...prev,
      companies: [
        ...prev.companies,
        {
          id: Date.now(),
          name: '',
          sector: '',
          stage: '',
          founderEmail: '',
          status: 'active'
        }
      ]
    }));
  };

  const handleBulkUpload = (type) => {
    toast.success(`CSV template downloaded`, {
      description: `Upload your ${type} data using the template`
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Admin Workspace Setup</h1>
              <p className="text-sm text-muted-foreground">Set up your fund workspace in 10 minutes</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Step {step} of {totalSteps}</span>
              <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Stepper */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {steps.map((s) => {
                    const Icon = s.icon;
                    const isActive = s.num === step;
                    const isComplete = s.num < step;
                    
                    return (
                      <div
                        key={s.num}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isActive ? 'bg-primary/10 border border-primary' :
                          isComplete ? 'bg-success/10' :
                          'bg-muted/50'
                        }`}
                      >
                        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-primary text-primary-foreground' :
                          isComplete ? 'bg-success text-success-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {isComplete ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            isActive ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {s.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{steps[step - 1].title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Welcome */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="text-center py-6">
                      <Rocket className="h-16 w-16 text-primary mx-auto mb-4" />
                      <h2 className="text-2xl font-semibold mb-2">Welcome to Startup Intel</h2>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Let's set up your fund workspace. This should take about 10 minutes.
                      </p>
                    </div>
                    
                    <div className="space-y-4 max-w-md mx-auto">
                      <div>
                        <Label htmlFor="orgName">Organization / Fund Name *</Label>
                        <Input
                          id="orgName"
                          value={formData.orgName}
                          onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                          placeholder="e.g., Acme Ventures"
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="userName">Your Name *</Label>
                        <Input
                          id="userName"
                          value={formData.userName}
                          onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                          placeholder="John Doe"
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Work Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@acme.vc"
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="country">Country / Region</Label>
                        <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="in">India</SelectItem>
                            <SelectItem value="sg">Singapore</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="mb-3 block">Primary Use Case *</Label>
                        <RadioGroup value={formData.useCase} onValueChange={(v) => setFormData({ ...formData, useCase: v })}>
                          {['VC Fund', 'Accelerator', 'Family Office', 'Angel Network'].map(use => (
                            <div key={use} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50">
                              <RadioGroupItem value={use.toLowerCase().replace(' ', '_')} id={use} />
                              <Label htmlFor={use} className="flex-1 cursor-pointer">{use}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Workspace Setup */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fundName">Fund / Organization Name</Label>
                        <Input
                          id="fundName"
                          value={formData.fundName}
                          onChange={(e) => setFormData({ ...formData, fundName: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="currency">Default Currency</Label>
                        <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="INR">INR (₹)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="reportingFreq">Reporting Frequency</Label>
                        <Select value={formData.reportingFrequency} onValueChange={(v) => setFormData({ ...formData, reportingFrequency: v })}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="timezone">Time Zone</Label>
                        <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="EST">EST</SelectItem>
                            <SelectItem value="PST">PST</SelectItem>
                            <SelectItem value="IST">IST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="mb-3 block">Investment Stages Covered</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'].map(stage => (
                          <div key={stage} className="flex items-center space-x-2 border rounded-lg p-3">
                            <Checkbox
                              id={stage}
                              checked={formData.investmentStages.includes(stage)}
                              onCheckedChange={(checked) => {
                                setFormData(prev => ({
                                  ...prev,
                                  investmentStages: checked
                                    ? [...prev.investmentStages, stage]
                                    : prev.investmentStages.filter(s => s !== stage)
                                }));
                              }}
                            />
                            <Label htmlFor={stage} className="flex-1 cursor-pointer text-sm">{stage}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Team Setup */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Add Team Members</h3>
                        <p className="text-sm text-muted-foreground">Invite investors and team members</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleBulkUpload('team')}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Import CSV
                        </Button>
                        <Button size="sm" onClick={handleAddTeamMember}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      </div>
                    </div>
                    
                    {formData.teamMembers.length > 0 ? (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Access</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.teamMembers.map(member => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <Input
                                    value={member.name}
                                    placeholder="Name"
                                    className="h-8"
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        teamMembers: prev.teamMembers.map(m =>
                                          m.id === member.id ? { ...m, name: e.target.value } : m
                                        )
                                      }));
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="email"
                                    value={member.email}
                                    placeholder="email@domain.com"
                                    className="h-8"
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        teamMembers: prev.teamMembers.map(m =>
                                          m.id === member.id ? { ...m, email: e.target.value } : m
                                        )
                                      }));
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={member.role}
                                    onValueChange={(v) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        teamMembers: prev.teamMembers.map(m =>
                                          m.id === member.id ? { ...m, role: v } : m
                                        )
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="partner">Partner</SelectItem>
                                      <SelectItem value="principal">Principal</SelectItem>
                                      <SelectItem value="analyst">Analyst</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">All Portfolio</Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveTeamMember(member.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">No team members added yet</p>
                        <Button onClick={handleAddTeamMember}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add First Member
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Portfolio Import */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Import Portfolio Companies</h3>
                        <p className="text-sm text-muted-foreground">Add startups to your portfolio</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleBulkUpload('companies')}>
                          <Upload className="h-4 w-4 mr-2" />
                          Bulk Upload
                        </Button>
                        <Button size="sm" onClick={handleAddCompany}>
                          Add Company
                        </Button>
                      </div>
                    </div>
                    
                    {formData.companies.length > 0 ? (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Company Name</TableHead>
                              <TableHead>Sector</TableHead>
                              <TableHead>Stage</TableHead>
                              <TableHead>Founder Email</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.companies.map(company => (
                              <TableRow key={company.id}>
                                <TableCell>
                                  <Input
                                    value={company.name}
                                    placeholder="Company name"
                                    className="h-8"
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        companies: prev.companies.map(c =>
                                          c.id === company.id ? { ...c, name: e.target.value } : c
                                        )
                                      }));
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    value={company.sector} 
                                    placeholder="Sector" 
                                    className="h-8"
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        companies: prev.companies.map(c =>
                                          c.id === company.id ? { ...c, sector: e.target.value } : c
                                        )
                                      }));
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select 
                                    value={company.stage}
                                    onValueChange={(value) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        companies: prev.companies.map(c =>
                                          c.id === company.id ? { ...c, stage: value } : c
                                        )
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {formData.investmentStages.length > 0 ? (
                                        formData.investmentStages.map(stage => (
                                          <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                        ))
                                      ) : (
                                        <SelectItem value="not-set" disabled>
                                          Select stages in Step 2 first
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="email"
                                    value={company.founderEmail}
                                    placeholder="founder@startup.com"
                                    className="h-8"
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        companies: prev.companies.map(c =>
                                          c.id === company.id ? { ...c, founderEmail: e.target.value } : c
                                        )
                                      }));
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        companies: prev.companies.filter(c => c.id !== company.id)
                                      }));
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">No companies added yet</p>
                        <Button onClick={handleAddCompany}>Add First Company</Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Founder Invites */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Founder Invitation Setup</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure how founders will be invited to report
                      </p>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Send invitations now</p>
                          <p className="text-sm text-muted-foreground">
                            {formData.companies.length} companies ready to invite
                          </p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Request integrations</p>
                          <p className="text-sm text-muted-foreground">Ask founders to connect data sources</p>
                        </div>
                        <Checkbox defaultChecked />
                      </div>
                      
                      <div>
                        <Label htmlFor="welcomeNote">Welcome Message (optional)</Label>
                        <Textarea
                          id="welcomeNote"
                          placeholder="Add a personal message for your founders..."
                          className="mt-2"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Metrics and Rules */}
                {step === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Configure Metrics & Rules</h3>
                      <p className="text-sm text-muted-foreground">
                        Set default health scores and alert thresholds
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Health Score Template</Label>
                        <Select value={formData.healthScoreTemplate} onValueChange={(v) => setFormData({ ...formData, healthScoreTemplate: v })}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="balanced">Balanced (Recommended)</SelectItem>
                            <SelectItem value="growth-focused">Growth-Focused</SelectItem>
                            <SelectItem value="efficiency-focused">Efficiency-Focused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="runwayThreshold">Runway Alert Threshold (months)</Label>
                        <Input
                          id="runwayThreshold"
                          type="number"
                          value={formData.runwayThreshold}
                          onChange={(e) => setFormData({ ...formData, runwayThreshold: parseInt(e.target.value) })}
                          className="mt-2"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label>Required Reporting Sections</Label>
                        {[
                          { id: 'financial', label: 'Financial Summary' },
                          { id: 'gtm', label: 'GTM Metrics' },
                          { id: 'product', label: 'Product & Execution' },
                          { id: 'team', label: 'Team Updates' }
                        ].map(section => (
                          <div key={section.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={section.id}
                              checked={formData.requiredSections.includes(section.id)}
                              onCheckedChange={(checked) => {
                                setFormData(prev => ({
                                  ...prev,
                                  requiredSections: checked
                                    ? [...prev.requiredSections, section.id]
                                    : prev.requiredSections.filter(s => s !== section.id)
                                }));
                              }}
                            />
                            <Label htmlFor={section.id} className="cursor-pointer">{section.label}</Label>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="founderEdit"
                          checked={formData.founderCanEdit}
                          onCheckedChange={(checked) => setFormData({ ...formData, founderCanEdit: checked })}
                        />
                        <Label htmlFor="founderEdit" className="cursor-pointer">
                          Allow founders to edit auto-generated reports
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={step === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button onClick={handleNext}>
                    {step === totalSteps ? (
                      <>Complete Setup<CheckCircle2 className="h-4 w-4 ml-2" /></>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
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

export default AdminOnboarding;