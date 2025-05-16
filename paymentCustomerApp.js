import React, { useState, useContext, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReusableHeader from "../components/ReusableHeader";
import { BaseUrl } from "../constants/theme";
import axios from "axios";
import { UserProfileContext } from "../context/UserProfileContext";
import { SocketContext } from "../context/SocketContext";
import { CartCountContext } from "../context/CartCountContext";
import GoogleApiServices from "../hooks/GoogleApiServices";
import useFetchDefaultAddress from "../hooks/useFetchDefaultAdress";
import { toast } from "react-toastify";
import { BsExclamationCircle, BsGeoAlt } from "react-icons/bs";
import { PaystackConsumer } from "react-paystack";
import { FaChevronRight } from "react-icons/fa6";
import { RiDiscountPercentFill } from "react-icons/ri";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderItem, totalPrice, storeId, pack, coords, storeType, fromCart } =
    location.state?.params || {};

  const PAYSTACK_KEY = process.env.REACT_APP_PAYSTACK_KEY;

  const [distanceTime, setDistanceTime] = useState({});
  const [tokenVal, setTokenVal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [useWallet, setUseWallet] = useState(false); // Wallet toggle
  const [promoCode, setPromoCode] = useState(""); // Promo code input
  const [deliveryFee, setDeliveryFee] = useState(500); // Default delivery fee
  const [orderId, setOrderId] = useState(null);
  const [showPaystack, setShowPaystack] = useState(false);
  const [isDistanceCalculated, setIsDistanceCalculated] = useState(false);

  const total =
    orderDetails?.orderTotal +
    orderDetails?.discountedDeliveryFee +
    orderDetails?.serviceFee;

  const { socket } = useContext(SocketContext);

  const { profileDetails, updateProfileDetails } =
    useContext(UserProfileContext);

  const { refetch: cartRefresh } = useContext(CartCountContext);

  const { defaultAddress, isAddressLoading, error, refetch } =
    useFetchDefaultAddress();

  const calculateDistanceAndTime = async () => {
    try {
      const lat = localStorage.getItem("latitude");
      const long = localStorage.getItem("longitude");

      if (lat && long && coords?.latitude && coords?.longitude) {
        const result = await GoogleApiServices.calculateDistanceAndTime(
          lat,
          long,
          coords?.latitude,
          coords?.longitude
        );

        if (result) {
          setDistanceTime(result);
          setDeliveryFee(result.finalPrice || 500);
          setIsDistanceCalculated(true);
        }
      }
    } catch (error) {
      console.error(
        "Error retrieving coordinates or calculating distance:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const accessToken = JSON.parse(token);
      const response = await axios.post(
        `${BaseUrl}/api/orders/calculate`,
        {
          promoCode,
          useWallet,
          orderTotal: totalPrice,
          deliveryFee,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data.status) {
        setOrderDetails(response.data);
        if (response.data.promoCodeStatus.message) {
          toast.info(response?.data?.promoCodeStatus.message, {
            position: "top-center",
            autoClose: 3000,
          });
        }
      } else {
        toast.error(response?.data?.message || "Something went wrong.", {
          position: "top-center",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error(
        "Error fetching order details:",
        error?.response?.data?.message
      );
      toast.error(error?.response?.data?.message || "Something went wrong.", {
        position: "top-center",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCartItem = async () => {
    const token = localStorage.getItem("token");
    const accessToken = JSON.parse(token);

    const itemType = storeType === "GroceryStore" ? "Grocery" : "Food";

    try {
      const response = await axios.delete(
        `${BaseUrl}/api/cart/delete/${storeId}/${itemType}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      cartRefresh();
    } catch (error) {
      console.error("There was a problem with the axios request:", error);
      console.log("error: ", error.response.data);
    }
  };

  useEffect(() => {
    refetch();
    calculateDistanceAndTime();
    setPromoCode(""); // Reset promo code
    setUseWallet(false); // Reset wallet usage
    fetchOrderDetails(); // Fetch the updated order details
    setIsLoading(true);
  }, []);

  // Run fetchOrderDetails whenever distanceTime is updated
  useEffect(() => {
    if (isDistanceCalculated && distanceTime.finalPrice) {
      fetchOrderDetails();
    }
  }, [isDistanceCalculated, distanceTime, useWallet]);

  const duration = distanceTime.duration;

  // Convert duration to a number if it's a string or other type
  const durationInMinutes =
    typeof duration === "number" ? duration : parseFloat(duration);

  const groceryTime = isNaN(durationInMinutes)
    ? ""
    : Math.ceil(Number(durationInMinutes) * 1.2 + 10) + " mins";

  // Multiply the duration by 3 and add "mins" text
  const totalMins =
    isNaN(durationInMinutes) || isNaN(orderItem[0].time)
      ? ""
      : Math.ceil(Number(durationInMinutes) * 1.2 + Number(orderItem[0].time)) +
        " mins";

  const handleTextChange = (text) => {
    setPromoCode(text.toUpperCase());
  };

  const handleWalletUsageChange = () => {
    setUseWallet(!useWallet);
  };

  let orderObject;

  if (defaultAddress !== null && distanceTime) {
    orderObject = {
      userId: defaultAddress.userId,
      orderItems: orderItem,
      orderTotal: totalPrice,
      deliveryFee: orderDetails?.riderDeliveryFee,
      serviceFee: orderDetails?.serviceFee,
      grandTotal: orderDetails?.grandTotal,
      deliveryAddress: defaultAddress._id,
      paymentMethod: "Paystack",
      storeId: storeId,
      storeType,
      discountAmount: orderDetails?.discountAmount,
      referredBy: orderDetails?.referrerId,
      freeDelivery: orderDetails?.freeDelivery,
      walletAmountUsed: orderDetails?.walletAmountUsed,
    };
  }

  const createOrder = async () => {
    if (!defaultAddress) {
      navigate("/add-address");
      toast.info("Please add a default delivery address.", {
        position: "top-center",
        autoClose: 3000,
      });

      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setTokenVal(null);
      return;
    } else {
      setTokenVal(token);
    }

    const accessToken = JSON.parse(token);
    setIsLoading(true);

    try {
      const totalAmount =
        totalPrice +
        orderDetails?.discountedDeliveryFee +
        orderDetails?.serviceFee;
      let paymentAmount = totalAmount;

      if (useWallet === true && orderDetails?.walletAmountUsed === 0) {
        toast.error(
          "You cannot make use of your wallet for payment, your wallet balance is ₦0",
          {
            position: "top-center",
            autoClose: 3000,
          }
        );
      }

      if (useWallet) {
        if (orderDetails?.walletPayment === true) {
          // Use wallet balance for full payment

          await handleWalletPayment();
        } else if (orderDetails?.partialWalletPayment === true) {
          await handlePartialWalletPayment();
        }
      } else {
        await handlePaystackPayment(totalAmount);
      }
    } catch (error) {
      console.error("There was a problem with the axios request:", error);
      toast.error(error.response.data.message, {
        position: "top-center",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletPayment = async () => {
    try {
      const token = localStorage.getItem("token");

      const accessToken = JSON.parse(token);
      // Create the order with the wallet balance covering the full amount
      const response = await axios.post(
        `${BaseUrl}/api/orders`,
        {
          ...orderObject,
          grandTotal:
            totalPrice +
            orderDetails?.discountedDeliveryFee +
            orderDetails?.serviceFee,
          paymentMethod: "Wallet",
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.status === 201) {
        const orderId = response.data.data._id;

        // Make the wallet payment
        await axios.post(
          `${BaseUrl}/api/orders/wallet-payment`,
          {
            orderId,
            senderId: defaultAddress.userId,
            storeId: storeId,
            referredBy: orderDetails?.referrerId,
            storeType,
            walletAmountUsed: orderDetails?.walletAmountUsed,
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        // console.log(
        //   "deduct wallet from full wallet payment: ",
        //   orderDetails?.walletAmountUsed
        // );

        // // Update wallet balance after successful payment
        // await axios.post(
        //   `${BaseUrl}/api/orders/update-wallet`,
        //   {
        //     amountUsed: orderDetails?.walletAmountUsed,
        //   },
        //   {
        //     headers: { Authorization: `Bearer ${accessToken}` },
        //   }
        // );

        socket?.emit("sendOrder", {
          senderId: defaultAddress.userId,
          storeId: storeId,
          orderId,
        });

        if (fromCart === true) {
          deleteCartItem();
        }

        navigate("/payment-success", {
          state: {
            params: {
              totalPrice:
                totalPrice +
                orderDetails?.discountedDeliveryFee +
                orderDetails?.serviceFee,
              defaultAddress: defaultAddress,
              orderItem: orderItem,
            },
          },
        });
      }
    } catch (error) {
      console.error("Error handling wallet payment:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Something went wrong, please try again.";
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 10000,
      });
    }
  };

  const handlePartialWalletPayment = async () => {
    const token = localStorage.getItem("token");

    const accessToken = JSON.parse(token);
    try {
      // Create the order with the wallet balance used partially
      const response = await axios.post(
        `${BaseUrl}/api/orders`,
        {
          ...orderObject,
          grandTotal:
            totalPrice +
            orderDetails?.discountedDeliveryFee +
            orderDetails?.serviceFee,
          paymentMethod: "PatialWallet",
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.status === 201) {
        setOrderId(response.data.data._id);
        setShowPaystack(true);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Something went wrong, please try again.";
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 10000,
      });
    }
  };

  const handlePaystackPayment = async (totalAmount) => {
    try {
      const response = await axios.post(
        `${BaseUrl}/api/orders`,
        {
          ...orderObject,
          grandTotal:
            totalPrice +
            orderDetails?.discountedDeliveryFee +
            orderDetails?.serviceFee,
        },
        {
          headers: { Authorization: `Bearer ${tokenVal}` },
        }
      );

      if (response.status === 201) {
        setOrderId(response.data.data._id);
        setShowPaystack(true);
      }
    } catch (error) {
      console.error("Error handling Paystack payment:", error.response.data);
      const errorMessage =
        error.response?.data?.message ||
        "Something went wrong, please try again.";
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 10000,
      });
    }
  };

  const handlePaystackSuccess = async (reference) => {
    setShowPaystack(false);

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const accessToken = JSON.parse(token);

    try {
      const response = await axios.post(
        `${BaseUrl}/api/orders/verify-payment`,
        {
          reference: reference?.reference,
          orderId: orderId,
          senderId: defaultAddress.userId,
          storeId: storeId,
          referredBy: orderDetails?.referrerId,
          storeType,
          walletAmountUsed: orderDetails?.walletAmountUsed,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.status) {
        if (fromCart === true) {
          deleteCartItem();
        }

        navigate("/payment-success", {
          state: {
            params: {
              totalPrice:
                totalPrice +
                orderDetails.discountedDeliveryFee +
                orderDetails?.serviceFee,
              defaultAddress: defaultAddress,
              orderItem: orderItem,
            },
          },
        });

        // console.log(
        //   "deduct wallet from partial wallet payment: ",
        //   orderDetails?.walletAmountUsed
        // );
        // await axios.post(
        //   `${BaseUrl}/api/orders/update-wallet`,
        //   {
        //     amountUsed: orderDetails?.walletAmountUsed,
        //   },
        //   {
        //     headers: { Authorization: `Bearer ${accessToken}` },
        //   }
        // );

        socket?.emit("sendOrder", {
          senderId: defaultAddress.userId,
          storeId: storeId,
          orderId,
        });
      } else {
        console.error(response.data.message);
      }
    } catch (error) {
      console.error("Error verifying payment: ", error);
      console.log(error.response.data.message);
    }
  };

  const handlePaystackCancel = () => {
    setShowPaystack(false);
    toast.info("Payment was cancelled!", {
      position: "top-center",
      autoClose: 3000,
    });
  };

  const config = {
    reference: orderId,
    email: profileDetails?.email,
    amount: orderDetails?.grandTotal * 100, // Convert NGN to kobo
    currency: "NGN",
    publicKey: PAYSTACK_KEY,
    // metadata: {
    //   custom_fields: [
    //     {
    //       display_name: "Full Name",
    //       variable_name: "full_name",
    //       value: `${profileDetails?.firstName} ${profileDetails?.lastName}`,
    //     },
    //     {
    //       display_name: "Mobile Number",
    //       variable_name: "mobile",
    //       value: profileDetails?.phoneNumber,
    //     },
    //     {
    //       display_name: "Order Type",
    //       variable_name: "order_type",
    //       value: "Order Payment",
    //     },
    //   ],
    //   orderId: orderId,
    //   senderId: defaultAddress?.userId,
    //   storeId: storeId,
    //   referredBy: orderDetails?.referrerId || null,
    //   storeType: storeType,
    //   walletAmountUsed: orderDetails?.walletAmountUsed,
    // },
  };

  useEffect(() => {
    if (showPaystack && orderId) {
      document.getElementById("paystack-btn")?.click();
    }
  }, [showPaystack, orderId]);

  if (isAddressLoading || isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh)] overflow-y-auto bg-gray-100 items-center pb-[40px] relative ">
      <div className="w-full max-w-2xl pt-[20px]">
        <ReusableHeader title={"Payment"} />
        <div className="mx-3 mb-2.5 bg-white p-2.5 py-2.5 rounded-[8px] flex items-center flex-shrink mt-[20px]">
          <div>
            <BsExclamationCircle size={18} className="text-primary" />
          </div>
          <div className="flex-shrink mt-0.5 mx-[15px]">
            <p className=" font-regular text-primary text-[12px]">
              Delivery requires PIN confirmation
            </p>
          </div>
        </div>

        <p className="ml-3 font-[500] text-[13px] mt-[20px] mb-2.5 ">
          Delivery Address
        </p>

        <button
          onClick={() => navigate("/shipping-address")}
          className="w-full"
        >
          <div className="mx-3 bg-white p-1.5 py-2.5 rounded-[8px] flex items-center justify-between flex-shrink">
            <div className="flex items-center">
              <div>
                <BsGeoAlt size={18} className="text-primary" />
              </div>
              <div className="flex-shrink mt-0.5 mx-[15px]">
                {defaultAddress !== null ? (
                  <p className="text-gray-600 text-[12px] line-clamp-1 text-left">
                    {defaultAddress.addressLine1}
                  </p>
                ) : (
                  <p className="text-[12px] text-primary  line-clamp-1">
                    Click to add a default delivery address
                  </p>
                )}
              </div>
            </div>
            <FaChevronRight size={16} className="text-gray-400" />
          </div>
        </button>

        <p className="ml-3 font-[500] text-[13px] mt-[20px] mb-2.5 ">
          Payment Summary
        </p>

        <div className="mx-[12px] px-[10px] py-[8px] bg-white rounded-[8px]">
          <div className="flex justify-between mb-2">
            <p className="text-gray-500 text-[12px]">
              Approx Time (
              {storeType === "Restaurant"
                ? "Prep + Delivery"
                : "Packing + Delivery"}
              )
            </p>
            <p className="text-black text-[12px]">
              {storeType === "Restaurant" ? totalMins : groceryTime}
            </p>
          </div>

          <div className="flex justify-between mb-2">
            <p className="text-gray-500 text-[12px]">
              {storeType === "Restaurant" ? "Packs" : "Products"}
            </p>
            <p className="text-black text-[12px]">{pack}</p>
          </div>

          <div className="flex justify-between mb-2">
            <p className="text-gray-500 text-[12px]">Sub Total</p>
            <p className="text-black text-[12px]">
              {totalPrice?.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>

          <div className="flex justify-between mb-2">
            <p className="text-gray-500 text-[12px]">Delivery Fee</p>
            <div className="flex items-baseline">
              {orderDetails?.freeDelivery ? (
                <p className="text-primary text-sm font-medium mr-2">FREE</p>
              ) : (
                <p className="text-black text-[12px] mr-2">
                  {orderDetails?.discountedDeliveryFee?.toLocaleString(
                    "en-NG",
                    {
                      style: "currency",
                      currency: "NGN",
                      minimumFractionDigits: 0,
                    }
                  )}
                </p>
              )}
              <p className="text-black text-[12px] line-through">
                {(orderDetails?.normalDeliveryFee || 0)?.toLocaleString(
                  "en-NG",
                  {
                    style: "currency",
                    currency: "NGN",
                    minimumFractionDigits: 0,
                  }
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-between mb-2">
            <p className="text-gray-500 text-[12px]">Service Fee</p>
            <p className="text-black text-[12px]">
              {orderDetails?.serviceFee?.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>

          <div className="flex justify-between">
            <p className="text-black font-medium text-[12px]">Total</p>
            <p className="text-black text-[12px]">
              {total?.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center border-y-[1px] border-primary  mt-[20px] mb-2.5  px-[12px] py-[5px]">
          <RiDiscountPercentFill className="text-primary text-[22px]" />
          <input
            type="text"
            placeholder="Enter referral code"
            value={promoCode}
            onChange={(e) => handleTextChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-100 focus:outline-none focus:ring-0 focus:border-transparent text-[12px] placeholder:text-[12px]"
            spellCheck="false"
            autoCorrect="off"
          />
          <button
            onClick={fetchOrderDetails}
            className="px-5 py-2 border border-primary bg-secondary text-white rounded-[15px] text-[12px]"
          >
            Apply
          </button>
        </div>

        <div className="mt-[20px] p-3 bg-white rounded-[8px] mx-[12px]">
          <div className="flex justify-between">
            <p className="text-black text-[12px]">Discount</p>
            <p className="text-black text-[12px]">
              -{" "}
              {orderDetails?.discountAmount?.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>

          <div className="flex justify-between items-center mt-3 ">
            <label className="flex items-center space-x-[12px]">
              <input
                type="checkbox"
                checked={useWallet}
                onChange={handleWalletUsageChange}
                className="w-[15px] h-[15px] accent-primary border border-primary"
              />
              <span className="text-gray-500 text-[12px]">
                Use Wallet Balance
              </span>
            </label>
            {useWallet && (
              <p className="text-black text-[12px]">
                Wallet Balance:{" "}
                {orderDetails?.originalWalletBalance?.toLocaleString("en-NG", {
                  style: "currency",
                  currency: "NGN",
                  minimumFractionDigits: 0,
                })}
              </p>
            )}
          </div>

          <div className="flex justify-between mt-3">
            <p className="text-black text-[12px] font-[500]">Payable Total</p>
            <p className="text-primary text-[12px]">
              {orderDetails?.grandTotal?.toLocaleString("en-NG", {
                style: "currency",
                currency: "NGN",
                minimumFractionDigits: 0,
              })}
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-[30px]">
          <button
            onClick={() => createOrder(orderObject)}
            disabled={isLoading}
            className="max-w-lg w-full py-3 text-white font-bold rounded-lg flex justify-center items-center text-[12px] bg-primary hover:bg-orange-600 h-[50px] mx-[12px]"
          >
            {isLoading ? (
              <div className="w-[24px] h-[24px] border-[2px] border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-[12px]">Place Order</span>
            )}
          </button>
        </div>
      </div>

      <>
        {showPaystack && orderId && (
          <PaystackConsumer
            {...config}
            onSuccess={handlePaystackSuccess}
            onClose={handlePaystackCancel}
          >
            {({ initializePayment }) => (
              <button
                id="paystack-btn"
                onClick={() =>
                  initializePayment(handlePaystackSuccess, handlePaystackCancel)
                }
                hidden
              >
                Pay Now
              </button>
            )}
          </PaystackConsumer>
        )}
      </>
    </div>
  );
};

export default Payment;
