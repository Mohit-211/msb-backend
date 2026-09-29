const httpStatus = require("http-status");
const { Op } = require("sequelize");
const moment = require("moment");
const Stripe = require("stripe");

const { Payment, User } = require("../models");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");
const config = require("../config/config");
const {
  currancyTypes,
  paymentModeTypes,
  paymentStatusTypes,
} = require("../config/types");

const stripePublishableKey = config.STRIPE_PUBLISHABLE_KEY || "";
const stripeSecretKey = config.STRIPE_SECRET_KEY || "";
const stripeWebhookSecretIntentCharge =
  config.STRIPE_WEBHOOK_SECRET_INTENT_CHARGE || "";
const stripeWebhookSecretInvoiceCustomer =
  config.STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE || "";

function getKeys(payment_method) {
  try {
    let secret_key = stripeSecretKey;
    let publishable_key = stripePublishableKey;

    switch (payment_method) {
      case "grabpay":
      case "fpx":
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_MY;
        secret_key = process.env.STRIPE_SECRET_KEY_MY;
        break;
      case "au_becs_debit":
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_AU;
        secret_key = process.env.STRIPE_SECRET_KEY_AU;
        break;
      case "oxxo":
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_MX;
        secret_key = process.env.STRIPE_SECRET_KEY_MX;
        break;
      case "wechat_pay":
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_WECHAT;
        secret_key = process.env.STRIPE_SECRET_KEY_WECHAT;
        break;
      case "paypal":
        publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_UK;
        secret_key = process.env.STRIPE_SECRET_KEY_UK;
        break;
      default:
        publishable_key = publishable_key;
        secret_key = secret_key;
    }

    return { secret_key, publishable_key };
  } catch (error) {
    throw new ApiError(
      error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
}

const getCustomer = async (user, priceId, name, email, paymentMethod) => {
  try {
    let customer = {};
    const customerObj = {
      name: name,
      email: email,
      payment_method: paymentMethod,
      invoice_settings: {
        default_payment_method: paymentMethod,
      },
    };

    const { secret_key } = getKeys(paymentMethod);
    const stripe = new Stripe(secret_key, {
      apiVersion: "2022-11-15",
    });

    if (!user.stripe_customer_id || user.stripe_customer_id === "") {
      customer = await stripe.customers.create(customerObj);
      user.stripe_customer_id = customer.id;
      await user.save();
    } else {
      customer = await stripe.customers.retrieve(user.stripe_customer_id);
    }
    return customer ? customer : false;
  } catch (error) {
    throw new ApiError(
      error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

const geStripeKeys = catchAsync(async (req, res) => {
  try {
    const { publishable_key, secret_key } = getKeys(req.query.paymentMethod);
    return responseWrapper(res, { publishable_key }, "");
  } catch (error) {
    throw new ApiError(
      error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

const createPaymentIntent = catchAsync(async (req, res) => {
  try {
    const { paymentMethod, amount, currency, post_id, description, user } =
      req.body;
    const { publishable_key, secret_key } = getKeys(paymentMethod);
    const stripe = new Stripe(secret_key, {
      apiVersion: "2022-11-15",
    });

    const customer = await getCustomer(user, paymentMethod);
    // const paymentIntent = await stripe.paymentIntents.create({
    //     customer: customer.id,
    //     amount: (parseInt(amount) ? parseInt(amount) : config.DEFAULT_AMOUNT) * 100,
    //     currency: currency ? currency : currancyTypes.USD,
    //     payment_method_types: [paymentMethod ? paymentMethod : paymentModeTypes.CARD],
    //     description: description,
    //     metadata: { name: user.user_profile.name, user_name: user.user_name, email: user.email },
    //     payment_method: {
    //       billing_details: {
    //         name: user.user_profile.name,
    //       },
    //     },
    //   });
    const paymentIntent = await stripe.paymentIntents.create({
      customer: customer.id,
      amount:
        (parseInt(amount) ? parseInt(amount) : config.DEFAULT_AMOUNT) * 100,
      currency: currency ? currency : currancyTypes.USD,
      payment_method_types: [
        paymentMethod ? paymentMethod : paymentModeTypes.CARD,
      ],
      description: description,
      metadata: {
        name: user.user_profile.name,
        user_name: user.user_name,
        email: user.email,
      },
      shipping: {
        name: user.user_profile.name
          ? user.user_profile.name
          : "Unknown Person",
        address: {
          line1: "510 Townsend St",
          postal_code: "98140",
          city: "San Francisco",
          state: "CA",
          country: "US",
        },
      },
    });

    const paymentObj = {
      transaction_id: paymentIntent.id,
      amount: parseInt(amount) ? parseInt(amount) : config.DEFAULT_AMOUNT,
      currency: currency ? currency : currancyTypes.USD,
      description: description,
      user_id: user.id,
      role_id: user.role_id,
      post_id: post_id,
      payment_method: paymentMethod ? paymentMethod : paymentModeTypes.CARD,
      stripe_customer_id: customer.id,
    };
    const paymentDoc = await Payment.create(paymentObj);
    if (!paymentDoc)
      return responseWrapper(
        res,
        "Failed to initialize a Payment.",
        "",
        httpStatus.INTERNAL_SERVER_ERROR
      );

    const response = {
      clientSecret: paymentIntent.client_secret,
      customer: customer.id,
      publishableKey: publishable_key,
    };
    return responseWrapper(res, response, "");
  } catch (error) {
    throw new ApiError(
      error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

const handleChargeAndIntentWebhook = catchAsync(async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    
    // let event;
    // const { publishable_key, secret_key } = getKeys(paymentMethod = '');
    // const stripe = new Stripe(secret_key, {
    //     apiVersion: "2022-11-15",
    // });
    // event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecretIntentCharge);

    const event = req.body;
    let eventObj = event.data.object;
    // console.log(
    //     "111111111111111111111111 : event.type : event.type : event.type ---------------",
    //     event.type,
    //     eventObj,
    // );
    switch (event.type) {
      case "charge.captured":
        const chargeCaptured = event.data.object;
        // Then define and call a function to handle the event charge.captured
        break;
      case "charge.expired":
        const chargeExpired = event.data.object;
        // Then define and call a function to handle the event charge.expired
        break;
      case "charge.failed":
        const chargeFailed = event.data.object;
        // Then define and call a function to handle the event charge.failed
        break;
      case "charge.pending":
        const chargePending = event.data.object;
        // Then define and call a function to handle the event charge.pending
        break;
      case "charge.refunded":
        const chargeRefunded = event.data.object;
        // Then define and call a function to handle the event charge.refunded
        break;
      case "charge.succeeded":
        const chargeSucceeded = event.data.object;
        let paymentIntentId = chargeSucceeded.payment_intent;
        let receipt_url = chargeSucceeded.receipt_url;
        // console.log("11111111111111111111111111111111119666666666666666666666666666666", chargeSucceeded, paymentIntentId, receipt_url)
        let paymentObj = await Payment.findOne({
          where: { transaction_id: paymentIntentId },
        });
        if (paymentObj) {
          paymentObj.payment_status = paymentStatusTypes.SUCCESS;
          paymentObj.receipt_url = receipt_url;
          await paymentObj.save();
          await Post.update(
            { is_paid: true },
            { where: { id: paymentObj.post_id } }
          );
        }
        break;
      case "charge.updated":
        const chargeUpdated = event.data.object;
        // Then define and call a function to handle the event charge.updated
        break;
      case "charge.dispute.closed":
        const chargeDisputeClosed = event.data.object;
        // Then define and call a function to handle the event charge.dispute.closed
        break;
      case "charge.dispute.created":
        const chargeDisputeCreated = event.data.object;
        // Then define and call a function to handle the event charge.dispute.created
        break;
      case "charge.dispute.funds_reinstated":
        const chargeDisputeFundsReinstated = event.data.object;
        // Then define and call a function to handle the event charge.dispute.funds_reinstated
        break;
      case "charge.dispute.funds_withdrawn":
        const chargeDisputeFundsWithdrawn = event.data.object;
        // Then define and call a function to handle the event charge.dispute.funds_withdrawn
        break;
      case "charge.dispute.updated":
        const chargeDisputeUpdated = event.data.object;
        // Then define and call a function to handle the event charge.dispute.updated
        break;
      case "charge.refund.updated":
        const chargeRefundUpdated = event.data.object;
        // Then define and call a function to handle the event charge.refund.updated
        break;
      case "mandate.updated":
        const mandateUpdated = event.data.object;
        // Then define and call a function to handle the event mandate.updated
        break;
      case "payment_intent.amount_capturable_updated":
        const paymentIntentAmountCapturableUpdated = event.data.object;
        // Then define and call a function to handle the event payment_intent.amount_capturable_updated
        break;
      case "payment_intent.canceled":
        const paymentIntentCanceled = event.data.object;
        // Then define and call a function to handle the event payment_intent.canceled
        break;
      case "payment_intent.created":
        const paymentIntentCreated = event.data.object;
        // Then define and call a function to handle the event payment_intent.created
        break;
      case "payment_intent.partially_funded":
        const paymentIntentPartiallyFunded = event.data.object;
        // Then define and call a function to handle the event payment_intent.partially_funded
        break;
      case "payment_intent.payment_failed":
        const paymentIntentPaymentFailed = event.data.object;
        // Then define and call a function to handle the event payment_intent.payment_failed
        break;
      case "payment_intent.processing":
        const paymentIntentProcessing = event.data.object;
        // Then define and call a function to handle the event payment_intent.processing
        break;
      case "payment_intent.requires_action":
        const paymentIntentRequiresAction = event.data.object;
        // Then define and call a function to handle the event payment_intent.requires_action
        break;
      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data.object;
        // Then define and call a function to handle the event payment_intent.succeeded
        break;
      case "payment_method.attached":
        const paymentMethodAttached = event.data.object;
        // Then define and call a function to handle the event payment_method.attached
        break;
      case "payment_method.automatically_updated":
        const paymentMethodAutomaticallyUpdated = event.data.object;
        // Then define and call a function to handle the event payment_method.automatically_updated
        break;
      case "payment_method.detached":
        const paymentMethodDetached = event.data.object;
        // Then define and call a function to handle the event payment_method.detached
        break;
      case "payment_method.updated":
        const paymentMethodUpdated = event.data.object;
        // Then define and call a function to handle the event payment_method.updated
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    console.log("Webhook event fired : ------------> ", event.type);
    return true;
  } catch (error) {
    console.log("Error : Error : Webhook event fired : ------------> ", error);
    throw new ApiError(
      error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

const getNewPaymentCount = catchAsync(async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");
    const paymentDoc = await Payment.findAll({
      attributes: ["id"],
      where: {
        created_at: {
          [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`],
        },
        payment_status: "SUCCESS",
      },
    });
    if (!paymentDoc)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Fetch Count"
      );
    return responseWrapper(res, paymentDoc.length ? paymentDoc.length : 0, "");
  } catch (error) {
    throw new ApiError(
      error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

const getNewPaymentTotal = catchAsync(async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");
    const paymentDoc = await Payment.findAll({
      attributes: ["id", "amount"],
      where: {
        created_at: {
          [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`],
        },
        payment_status: "SUCCESS",
      },
    });
    if (!paymentDoc)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Fetch Count"
      );
    let totalPayment = paymentDoc
      .map((obj) => obj.amount)
      .reduce((a, b) => a + b, 0);
    return responseWrapper(res, totalPayment ? totalPayment : 0, "");
  } catch (error) {
    throw new ApiError(
      error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

const getAllPayment = catchAsync(async (req, res) => {
  try {
    const query = pick(req.query, ["limit", "sortBy", "offset", "page"]);
    const params = pick(req.params, ["user_id"]);
    if (!query["limit"]) {
      query["limit"] = config.defaultLimit;
    }
    if (!query["page"]) {
      query["page"] = 1;
    }
    if (!query["sortBy"] || query["sortBy"] === "") {
      query["sortBy"] = "ASC";
    }
    let offset = (query["page"] - 1) * query["limit"];
    query["offset"] = offset;

    const paymentDoc = await Payment.findAll({
      attributes: [
        "id",
        "transaction_id",
        "currency",
        "amount",
        "user_id",
        "description",
        "post_id",
        "payment_status",
        "payment_mode",
      ],
      where: { is_active: true },
      limit: parseInt(query["limit"]),
      offset: parseInt(query["offset"]),
      order: [["created_at", query["sortBy"]]],
      include: [
        {
          model: User,
          as: "payment_user",
          attributes: ["id", "email"],
          include: [
            {
              model: Profile,
              as: "user_profile",
              attributes: [
                "name",
                "dialing_code",
                "mobile",
                "is_active",
                "created_at",
              ],
            },
          ],
        },
      ],
    });
    if (!paymentDoc)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Fetch All Payment"
      );
    return responseWrapper(res, paymentDoc ? paymentDoc : [], "");
  } catch (error) {
    throw new ApiError(
      error.statusCode ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
});

const createSubscription = catchAsync(async (req, res) => {
  try {
    let { user, priceId, name, email, paymentMethod } = req.body;
    // return res.send(req.body);

    const customer = await getCustomer(
      user,
      priceId,
      name,
      email,
      paymentMethod
    );
    const { publishable_key, secret_key } = getKeys("");
    const stripe = new Stripe(secret_key, {
      apiVersion: "2022-11-15",
    });
    

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_settings: {
        payment_method_options: {
          card: {
            request_three_d_secure: "any",
          },
        },
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    const paymentObj = {
      transaction_id: subscription.id,
      user_id: user.id,
    };
    const paymentDoc = await Payment.create(paymentObj);

    return res.send({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.log("1111111111111111111111", error);
    res.send(error.message);
  }
});

const getAllPricesForBlogs = catchAsync(async (req, res) => {
  try {
    const { publishable_key, secret_key } = getKeys("");
    const stripe = new Stripe(secret_key, {
      apiVersion: "2022-11-15",
    });

    const prices = await stripe.prices.list({
      type: "recurring",
      product: "prod_Oy9AOjvvgk3tjY",
      active: true,
    });
    return responseWrapper(res, prices.data, "");
  } catch (error) {
    return responseWrapper(res, [], error.message, 500);
  }
});

module.exports = {
  geStripeKeys,
  createPaymentIntent,
  handleChargeAndIntentWebhook,
  getNewPaymentCount,
  getNewPaymentTotal,
  getAllPayment,
  createSubscription,
  getAllPricesForBlogs,
};
