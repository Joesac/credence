CREATE TABLE "deposits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transaction_id" text,
	"member_id" uuid NOT NULL,
	"received_by" uuid NOT NULL,
	"payment_method" text NOT NULL,
	"amount" numeric NOT NULL,
	"refreshment_token" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"date_created" timestamp with time zone DEFAULT now() NOT NULL,
	"date_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"is_synced" boolean DEFAULT true NOT NULL,
	CONSTRAINT "deposits_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "fund_distributions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"member_id" uuid NOT NULL,
	"giver_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"date_received" text NOT NULL,
	"notes" text,
	"date_created" timestamp with time zone DEFAULT now() NOT NULL,
	"is_synced" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_repayments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"loan_id" uuid,
	"receiver_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"notes" text,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"date_created" timestamp with time zone DEFAULT now() NOT NULL,
	"is_synced" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"member_id" uuid NOT NULL,
	"issuer_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"interest_rate" numeric NOT NULL,
	"repayment_frequency" text NOT NULL,
	"due_date" text NOT NULL,
	"notes" text,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"date_created" timestamp with time zone DEFAULT now() NOT NULL,
	"date_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"is_synced" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_notification_prefs" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"deposit_alerts" boolean DEFAULT true NOT NULL,
	"withdrawal_alerts" boolean DEFAULT true NOT NULL,
	"loan_alerts" boolean DEFAULT true NOT NULL,
	"reminder_alerts" boolean DEFAULT true NOT NULL,
	"date_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"fullname" text NOT NULL,
	"account_number" text NOT NULL,
	"telephoneNumber" text NOT NULL,
	"location" text NOT NULL,
	"password" text,
	"creator_id" uuid NOT NULL,
	"date_created" timestamp with time zone DEFAULT now() NOT NULL,
	"date_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"is_synced" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"member_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text NOT NULL,
	"related_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"date_created" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"fullname" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"last_login" timestamp with time zone,
	"date_created" timestamp with time zone DEFAULT now() NOT NULL,
	"date_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"is_synced" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transaction_id" text,
	"member_id" uuid NOT NULL,
	"issuer_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"notes" text,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"date_created" timestamp with time zone DEFAULT now() NOT NULL,
	"date_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"is_synced" boolean DEFAULT true NOT NULL,
	CONSTRAINT "withdrawals_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_distributions" ADD CONSTRAINT "fund_distributions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_distributions" ADD CONSTRAINT "fund_distributions_giver_id_users_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_issuer_id_users_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notification_prefs" ADD CONSTRAINT "member_notification_prefs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_issuer_id_users_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;