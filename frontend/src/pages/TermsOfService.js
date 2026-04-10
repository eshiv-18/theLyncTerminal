import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card>
          <CardContent className="p-8">
            <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>

            <div className="space-y-6 text-sm">
              <section>
                <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using the Startup Progress Intelligence Platform ("Platform"), you agree to be 
                  bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Startup Intel provides a portfolio monitoring and automated reporting platform that enables:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Real-time portfolio health monitoring for investors</li>
                  <li>Automated report generation for founders</li>
                  <li>Integration with third-party services (Zoho Books, HubSpot, GitHub, Jira, Razorpay)</li>
                  <li>Alert systems for critical business metrics</li>
                  <li>Live activity feeds and analytics</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">3. User Accounts</h2>
                <h3 className="text-lg font-medium mb-2">3.1 Account Registration</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>You must be at least 18 years old to create an account</li>
                  <li>You must provide accurate and complete information</li>
                  <li>You are responsible for maintaining account security</li>
                  <li>One person or legal entity per account</li>
                </ul>

                <h3 className="text-lg font-medium mb-2 mt-4">3.2 User Roles</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Admin:</strong> Full system access, user management, workspace configuration</li>
                  <li><strong>Investor:</strong> Portfolio monitoring, report viewing, alert management</li>
                  <li><strong>Founder:</strong> Data integration, report submission, metrics management</li>
                </ul>

                <h3 className="text-lg font-medium mb-2 mt-4">3.3 Account Termination</h3>
                <p className="text-muted-foreground leading-relaxed ml-4">
                  We reserve the right to suspend or terminate accounts that violate these Terms or for any reason 
                  at our discretion.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">4. Acceptable Use</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">You agree NOT to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Upload malicious code or viruses</li>
                  <li>Attempt to gain unauthorized access to systems</li>
                  <li>Use automated systems to scrape or harvest data</li>
                  <li>Impersonate others or misrepresent affiliation</li>
                  <li>Interfere with or disrupt the Platform</li>
                  <li>Use the Platform for illegal or fraudulent activities</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">5. Third-Party Integrations</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  The Platform integrates with third-party services. You acknowledge that:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Integration requires your authorization and valid credentials</li>
                  <li>Data shared with integrations is subject to their respective privacy policies</li>
                  <li>We are not responsible for third-party service availability or data accuracy</li>
                  <li>You must comply with third-party terms of service</li>
                  <li>Integration features may change or be discontinued</li>
                </ul>

                <h3 className="text-lg font-medium mb-2 mt-4">Supported Integrations:</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Zoho Books (Financial data)</li>
                  <li>HubSpot (CRM data)</li>
                  <li>GitHub (Repository metrics)</li>
                  <li>Jira (Project management)</li>
                  <li>Razorpay (Payment processing)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">6. Data Ownership and License</h2>
                <h3 className="text-lg font-medium mb-2">6.1 Your Data</h3>
                <p className="text-muted-foreground leading-relaxed ml-4">
                  You retain all ownership rights to your business data, financial metrics, and reports. By using 
                  the Platform, you grant us a limited license to process, store, and display your data solely for 
                  providing the service.
                </p>

                <h3 className="text-lg font-medium mb-2 mt-4">6.2 Platform Content</h3>
                <p className="text-muted-foreground leading-relaxed ml-4">
                  All Platform features, design, code, and documentation are owned by Startup Intel and protected 
                  by intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">7. Payment Terms</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Subscription fees are billed in advance</li>
                  <li>All fees are non-refundable unless otherwise stated</li>
                  <li>We may change pricing with 30 days' notice</li>
                  <li>Failure to pay may result in service suspension</li>
                  <li>Taxes are your responsibility</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">8. Service Availability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We strive for high availability but do not guarantee uninterrupted service. We may perform 
                  maintenance, updates, or experience downtime. We are not liable for service interruptions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">9. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>The Platform is provided "AS IS" without warranties</li>
                  <li>We are not liable for indirect, incidental, or consequential damages</li>
                  <li>Our total liability is limited to fees paid in the last 12 months</li>
                  <li>We are not responsible for data loss (maintain your own backups)</li>
                  <li>We are not liable for third-party integration failures</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">10. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to indemnify and hold Startup Intel harmless from any claims, damages, or expenses 
                  arising from your use of the Platform, violation of these Terms, or infringement of third-party rights.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">11. Confidentiality</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Both parties agree to maintain confidentiality of sensitive information shared through the Platform. 
                  This includes financial data, business metrics, and proprietary information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">12. Data Security and Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement reasonable security measures to protect your data. However, no system is completely 
                  secure. Please review our Privacy Policy for details on data handling practices.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">13. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All trademarks, logos, and service marks displayed on the Platform are our property or licensed 
                  to us. You may not use them without prior written consent.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">14. Modifications to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may modify these Terms at any time. Material changes will be notified via email or Platform 
                  notification. Continued use after changes constitutes acceptance.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">15. Governing Law and Dispute Resolution</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms are governed by [Your Jurisdiction] law. Any disputes will be resolved through 
                  arbitration in [Your Location], except where prohibited by law.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">16. Severability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If any provision of these Terms is found unenforceable, the remaining provisions will continue 
                  in full effect.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">17. Entire Agreement</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms, along with our Privacy Policy, constitute the entire agreement between you and 
                  Startup Intel regarding the Platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3">18. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  For questions about these Terms, please contact us:
                </p>
                <div className="mt-3 p-4 bg-muted rounded-lg">
                  <p className="font-medium">Startup Intel</p>
                  <p className="text-muted-foreground">Email: legal@startupintel.com</p>
                  <p className="text-muted-foreground">Address: [Your Business Address]</p>
                </div>
              </section>

              <section className="border-t pt-6 mt-8">
                <p className="text-xs text-muted-foreground">
                  By clicking "I Accept" or using the Platform, you acknowledge that you have read, understood, 
                  and agree to be bound by these Terms of Service.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
