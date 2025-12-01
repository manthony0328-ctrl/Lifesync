export default function Affiliates() {
  return (
    <div className="min-h-screen pt-20 pb-16 bg-background">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="heading-affiliates">Affiliates Program</h1>
          <p className="text-lg text-muted-foreground" data-testid="text-affiliates-intro">
            Join our affiliate program and earn recurring commissions by referring LifeSync Pro to others.
          </p>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold" data-testid="heading-how-it-works">How It Works</h2>
            <p className="text-muted-foreground">
              Share your unique affiliate link with your audience. When someone signs up using your link and becomes a paying customer, you earn a commission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold" data-testid="heading-commissions">Commission Structure</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• 30% recurring commission on Basic plan ($29/month)</li>
              <li>• 30% recurring commission on Pro plan ($79/month)</li>
              <li>• 20% recurring commission on Enterprise plan ($199/month)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold" data-testid="heading-benefits">Benefits</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Lifetime recurring commissions</li>
              <li>• Marketing materials and assets provided</li>
              <li>• Real-time dashboard to track referrals</li>
              <li>• Monthly payouts via Stripe</li>
              <li>• Dedicated affiliate support</li>
            </ul>
          </section>

          <section className="space-y-4 border-t pt-8">
            <h2 className="text-2xl font-semibold" data-testid="heading-get-started">Ready to Get Started?</h2>
            <p className="text-muted-foreground">
              Contact our affiliate team to apply and get your unique affiliate link.
            </p>
            <a href="#contact" className="inline-block" data-testid="link-affiliates-contact">
              <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
                Contact Us
              </button>
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
