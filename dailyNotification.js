const mongoose = require("mongoose");
require("dotenv").config();
const { Expo } = require("expo-server-sdk");
const User = require("./models/User"); // Adjust path as needed

// Initialize Expo SDK
const expo = new Expo();

// Connect to your MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once("open", async () => {
  console.log("Connected to MongoDB");

  try {
    // Fetch all users with userType "Client" and a non-null expoPushToken
    const clients = await User.find({
      userType: "Client",
      expoPushToken: { $ne: null },
    });

    // Prepare push messages
    let messages = [];

    clients.forEach((user) => {
      const token = user.expoPushToken;

      if (Expo.isExpoPushToken(token)) {
        messages.push({
          to: token,
          sound: "default",
          title: "🥞 Fluffy. Syrupy. Toasty.",
          body: "Your pancakes from Benicacy Foods are waiting. Don’t let them get cold — tap to order now!",
          data: { withSome: "data" },
        });
      }
    });

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log("Sent chunk:", ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending chunk:", error);
      }
    }

    console.log("All notifications sent.");
  } catch (err) {
    console.error("Error fetching clients or sending notifications:", err);
  } finally {
    mongoose.disconnect();
  }
});

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Clipboard,
  Linking,
} from "react-native";
import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useContext,
  useMemo,
} from "react";
import axios from "axios";
import { useRoute } from "@react-navigation/native";
import { useOrder } from "../../context/OrderContext";
import { COLORS, SIZES, BaseUrl } from "../../constants/theme";
import { OtpInput } from "react-native-otp-entry";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { SocketContext } from "../../context/SocketContext";
import NetworkImage from "../../components/NetworkImage";
import MapView, {
  PROVIDER_GOOGLE,
  Marker,
  Polyline,
  AnimatedRegion,
} from "react-native-maps";
import { GoogleApiKey } from "../../constants/theme";
import MapViewDirections from "react-native-maps-directions";
import LottieView from "lottie-react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";

const LOCATION_TASK_NAME = "background-location-task";

const screen = Dimensions.get("window");
const ASPECT_RATIO = screen.width / screen.height;
const LATITUDE_DELTA = 0.00004;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const BACKEND_URL = `${BaseUrl}/api/rider/:id/coordinates`;
const UPDATE_INTERVAL = 60000; // 1 minute in milliseconds

const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

// Background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error.message || error);
    return;
  }
  if (!data || !data.locations || data.locations.length === 0) {
    console.warn("No location data received");
    return;
  }

  const { latitude, longitude } = data.locations[0]?.coords;
  console.log("Background Location:", { latitude, longitude });

  if (await isOnline()) {
    await sendLocationToBackend(latitude, longitude);
  } else {
    console.warn("Skipping sending location due to no internet connection");
  }
});

// Function to send location to the backend
const sendLocationToBackend = async (latitude, longitude) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return console.warn("No token found in storage");

    const accessToken = JSON.parse(token);
    const data = await AsyncStorage.getItem("rider");
    if (!data) return console.warn("No rider data found in storage");

    const rider = JSON.parse(data);
    const url = BACKEND_URL.replace(":id", rider._id);

    const response = await axios.put(
      url,
      { coordinates: [longitude, latitude] },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log("Location sent successfully:", response.data);
  } catch (error) {
    console.error("Error sending location:", error.message || error);
  }
};

const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  return isConnected;
};

const Ready = ({ order }) => {
  const copyToClipboard = () => {
    Clipboard.setString(order?.userId.phone);
    alert("Phone number copied to clipboard!");
  };

  const handlePhone = () => {
    Linking.openURL(`tel:${order?.userId.phone}`);
  };

  const copyStoreNumberToClipboard = () => {
    Clipboard.setString(order?.storeId.owner.phone);
    alert("Phone number copied to clipboard!");
  };

  const handleStorePhone = () => {
    Linking.openURL(`tel:${order?.storeId.owner.phone}`);
  };

  return (
    <View style={{ paddingHorizontal: 10 }}>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Store Details</Text>
        <View style={styles.textContainer}>
          <NetworkImage
            source={order?.storeId.logoUrl}
            width={50}
            height={50}
            radius={8}
          />

          <Text style={styles.contentText}>{order?.storeId.title}</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Store Address</Text>

          <Text style={styles.contentText}>
            {order?.storeId?.coords?.address}
          </Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Store Phone Number</Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "50%",
            }}
          >
            <Text style={[styles.contentText, { width: "auto" }]}>
              {order?.storeId.owner.phone}
            </Text>
            <FontAwesome
              onPress={handleStorePhone}
              name="phone"
              size={24}
              color="black"
            />
            <Ionicons
              onPress={copyStoreNumberToClipboard}
              name="copy"
              size={24}
              color="black"
            />
          </View>
        </View>

        {order?.orderStatus === "Rider Accepted Order" && (
          <View style={styles.textContainer}>
            <Text style={[styles.titleText, { fontWeight: "500" }]}>
              Store Confirmation Code
            </Text>

            <Text
              style={[styles.contentText, { fontSize: 20, fontWeight: "500" }]}
            >
              {order?.storeSecretCode}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Delivery Details</Text>
        <View style={styles.textContainer}>
          <NetworkImage
            source={order?.userId.profile}
            width={50}
            height={50}
            radius={99}
          />

          <Text
            style={{
              fontSize: 14,
              color: COLORS.primary,
              width: "50%",
              textAlign: "right",
              // whiteSpace: "nowrap", // Prevent text wrapping
            }}
            numberOfLines={1} // Limit to one line
          >
            {order?.userId.firstName}
            {"   "}
            {order?.userId.lastName}
          </Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Delivery Fee</Text>

          <Text style={styles.contentText}>
            {order?.deliveryFee?.toLocaleString("en-NG", {
              style: "currency",
              currency: "NGN",
              minimumFractionDigits: 0,
            })}
          </Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Delivery Address</Text>

          <Text style={styles.contentText}>
            {order?.deliveryAddress.addressLine1}
          </Text>
        </View>

        {(order?.orderStatus === "Rider Accepted Order" ||
          order?.orderStatus === "Out for Delivery" ||
          order?.orderStatus === "Arrived") && (
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>Customer Number</Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "50%",
              }}
            >
              <Text style={[styles.contentText, { width: "auto" }]}>
                {order?.userId.phone}
              </Text>
              <FontAwesome
                onPress={handlePhone}
                name="phone"
                size={24}
                color="black"
              />
              <Ionicons
                onPress={copyToClipboard}
                name="copy"
                size={24}
                color="black"
              />
            </View>
          </View>
        )}

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Delivery Instructions</Text>

          <Text style={styles.contentText}>
            {order?.deliveryAddress.deliveryInstructions}
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: COLORS.white,
          padding: 10,
          borderRadius: 8,
          // marginBottom: 20,
        }}
      >
        <Text style={styles.sectionHeader}>
          Order Items ({order?.orderItems?.length} Pack)
        </Text>

        {order?.orderItems?.map((item, index) => (
          <View key={item._id || index} style={{ marginBottom: 15 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <NetworkImage
                source={item?.imageUrl}
                width={50}
                height={50}
                radius={8}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "500" }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>
                  Quantity: {item.quantity}
                </Text>

                {/* Mapping additives */}
                {item?.additives?.length > 0 && (
                  <View style={{ marginTop: 5, flexDirection: "row" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        marginBottom: 5,
                      }}
                    >
                      Additives:
                    </Text>
                    <View style={{ marginLeft: 10 }}>
                      {item?.additives.map((additive, i) => (
                        <Text
                          key={i}
                          style={{ fontSize: 12, color: COLORS.gray }}
                        >
                          • {additive?.title}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const Pending = () => {
  const {
    orders,
    updateOrderStatus,
    isLoading,
    error,
    loadStatus,
    deliveryMessage,
    fetchData,
    fetchHistory,
    setError,
  } = useOrder();
  const route = useRoute();

  const { socket } = useContext(SocketContext);

  const [heading, setHeading] = useState(0);

  const [secretCode, setSecretCode] = useState("");

  const filteredOrders = orders.filter(
    (order) =>
      order?.orderStatus === "Ready" ||
      order?.orderStatus === "Rider Assigned" ||
      order?.orderStatus === "Rider Accepted Order" ||
      order?.orderStatus === "Out for Delivery" ||
      order?.orderStatus === "Arrived"
  );

  // console.log(filteredOrders);

  const orderDetails = filteredOrders[0];

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [
        {
          text: "OK",
          onPress: () => {
            fetchData();
            fetchHistory();
            setError("");
          },
        },
      ]);
    }
  }, [error]);

  // useEffect(() => {
  //   if (deliveryMessage) {
  //     Alert.alert("Alert", deliveryMessage, [{ text: "OK" }]);
  //   }
  // }, [deliveryMessage]);

  const handleStatusUpdate = (newStatus, riderResponse) => {
    console.log("secretCode from handleStatus: ", secretCode);
    updateOrderStatus(
      orderDetails._id,
      newStatus,
      orderDetails.userId._id,
      riderResponse,
      secretCode
    );
    console.log("sending socket", newStatus);
    socket?.emit("sendStatus", {
      customerId: orderDetails.userId._id,
      storeId: orderDetails.assignedRider,
      order: orderDetails._id,
    });
    // navigation.navigate("home");
  };

  // Location tracking in useEffect
  useEffect(() => {
    const startLocationTracking = async () => {
      // Request foreground location permission
      try {
        const { status: foregroundStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Foreground location permission is required.",
            [{ text: "Open Settings", onPress: () => Linking.openSettings() }]
          );
          return;
        }

        // Request background location permission
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Background location permission is required.",
            [{ text: "Open Settings", onPress: () => Linking.openSettings() }]
          );
          return;
        }

        // Start background location updates
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 0, // Disable time-based updates
          distanceInterval: 250, // Trigger updates only every 250 meters
          foregroundService: {
            notificationTitle: "Location Tracking",
            notificationBody: "Tracking your location in the background.",
          },
        });

        // Foreground location updates
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 0, // Disable time-based updates
            distanceInterval: 250, // Trigger updates only every 250 meters
          },
          async (location) => {
            const { latitude, longitude } = location?.coords;
            console.log("Foreground Location:", { latitude, longitude });

            // Update location on the backend
            if (await isOnline()) {
              await sendLocationToBackend(latitude, longitude);
            } else {
              console.warn(
                "Skipping sending location in foreground due to no internet"
              );
            }
          }
        );

        return () => subscription.remove();
      } catch (error) {
        console.error(
          "Error in location tracking setup:",
          error.message || error
        );
      }
    };

    startLocationTracking();

    return () => {
      // Unregister location tracking task on component unmount
      TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME).then(
        (isRegistered) => {
          if (isRegistered) {
            TaskManager.unregisterTaskAsync(LOCATION_TASK_NAME).catch(
              console.error
            );
          }
        }
      );
    };
  }, []);

  const onDirectionClick = () => {
    // Check the order status
    const { orderStatus, deliveryAddress, storeId } = orders[0];

    // Use store coordinates for certain statuses
    const isStoreDirection =
      orderStatus === "Ready" ||
      orderStatus === "Rider Assigned" ||
      orderStatus === "Rider Accepted Order";

    let latitude, longitude;

    if (isStoreDirection) {
      // Get store coordinates
      if (!storeId?.coords) return;
      latitude = storeId.coords?.latitude;
      longitude = storeId.coords?.longitude;
    } else if (
      orderStatus === "Out for Delivery" ||
      orderStatus === "Arrived"
    ) {
      // Get delivery address coordinates
      if (!deliveryAddress) return;
      latitude = deliveryAddress.latitude;
      longitude = deliveryAddress.longitude;
    } else {
      return; // Exit if orderStatus is not one of the above
    }

    // Construct the URL based on the platform
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}`,
    });

    // Open the URL with a fallback for error handling
    if (url) {
      Linking.openURL(url).catch((err) =>
        console.error("Failed to open URL:", err)
      );
    }
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          height: SIZES.height,
          width: SIZES.width,
          justifyContent: "center",
          alignItems: "center",

          backgroundColor: "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (filteredOrders.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.white,
        }}
      >
        <LottieView
          autoPlay
          style={{ width: "70%", height: SIZES.height / 3.2 }}
          source={require("../../../assets/anime/delivery.json")}
        />
        <Text style={{ fontSize: 16 }}>
          No New Order Request or Ongoing Order
        </Text>
      </View>
    );
  }

  // console.log("this is rider coords: ", riderCoords);

  const isConnected = useNetworkStatus();

  if (!isConnected) {
    return (
      <View style={styles.offlineContainer}>
        <Text style={styles.offlineText}>
          You're offline. Some features may not work.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.primary1 }}>
      <ScrollView style={{ flex: 1 }}>
        <View>
          <View
            style={{
              paddingBottom: 30,
              paddingTop: 30,
              backgroundColor: COLORS.primary1,
            }}
          >
            {(filteredOrders[0]?.orderStatus === "Ready" ||
              filteredOrders[0]?.orderStatus === "Rider Assigned") && (
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    textAlign: "center",
                    marginTop: 10,
                    fontWeight: "600",
                    color: COLORS.primary,
                  }}
                >
                  Pending Order
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginHorizontal: 10,
                    marginVertical: 15,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => {
                      handleStatusUpdate("Rider Assigned", "accept");
                    }}
                  >
                    <Text style={styles.buttonTextAccept}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={() => {
                      handleStatusUpdate("Rider Assigned", "decline");
                    }}
                  >
                    <Text style={styles.buttonTextReject}>Decline</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ marginBottom: 10 }}>
                  {loadStatus && <ActivityIndicator color="#fff" />}
                </View>
              </View>
            )}

            {filteredOrders[0]?.orderStatus === "Rider Accepted Order" && (
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    textAlign: "center",
                    marginTop: 10,
                    fontWeight: "600",
                    color: COLORS.primary,
                  }}
                >
                  Accepted Order
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginHorizontal: 10,
                    marginVertical: 15,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => {
                      handleStatusUpdate("Out for Delivery");
                    }}
                  >
                    <Text style={styles.buttonTextAccept}>
                      Out for delivery
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={() => {
                      handleStatusUpdate("Rider Assigned", "decline");
                    }}
                  >
                    <Text style={styles.buttonTextReject}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ marginBottom: 10 }}>
                  {loadStatus && <ActivityIndicator color="#fff" />}
                </View>
              </View>
            )}

            {filteredOrders[0]?.orderStatus === "Out for Delivery" && (
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    textAlign: "center",
                    marginTop: 10,
                    fontWeight: "600",
                    color: COLORS.primary,
                  }}
                >
                  Out For Delivery
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 10,
                    marginVertical: 15,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => {
                      handleStatusUpdate("Arrived");
                    }}
                  >
                    {loadStatus ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonTextAccept}>Arrived</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {filteredOrders[0]?.orderStatus === "Arrived" && (
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    textAlign: "center",
                    marginTop: 10,
                    fontWeight: "600",
                    color: COLORS.primary,
                  }}
                >
                  Arrived
                </Text>
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 15,
                    marginTop: 10,
                    marginBottom: 5,
                  }}
                >
                  Input delivery confirmation code from the customer
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <OtpInput
                    numberOfDigits={4}
                    focusColor={COLORS.primary}
                    focusStickBlinkingDuration={500}
                    onFilled={(secretCode) => setSecretCode(secretCode)}
                    theme={{
                      inputsContainerStyle: styles.inputsContainer,
                      pinCodeContainerStyle: styles.pinCodeContainer,
                      pinCodeTextStyle: styles.pinCodeText,
                      focusStickStyle: styles.focusStick,
                      focusedPinCodeContainerStyle:
                        styles.activePinCodeContainer,
                    }}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 10,
                    marginBottom: 15,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => {
                      handleStatusUpdate("Delivered");
                    }}
                  >
                    {loadStatus ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonTextAccept}>Delivered</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* <ScrollView> */}
            <Ready order={filteredOrders[0]} />
            {/* </ScrollView> */}
          </View>
        </View>
      </ScrollView>
      <View style={{ position: "absolute", top: 5, left: 10, zIndex: 999 }}>
        <TouchableOpacity
          style={{
            height: 45,
            justifyContent: "center",
            borderRadius: 12,
            marginVertical: 8,
            backgroundColor: "#1e1b4b80",
          }}
          onPress={onDirectionClick}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: "medium",
              paddingHorizontal: 10,
              color: COLORS.white,
            }}
          >
            🚶🏽‍♂️ Directions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Pending;

const styles = StyleSheet.create({
  contentContainer: {
    // flex: 1,
    // alignItems: "center",
  },

  button: {
    height: 45,
    width: SIZES.width / 2 - 35,

    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: COLORS.secondary,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
  },

  buttonTextReject: {
    fontFamily: "medium",
    color: COLORS.white,
  },
  buttonTextAccept: {
    fontFamily: "medium",
    color: COLORS.white,
  },
  titleText: { fontSize: 14, color: COLORS.black, width: "50%" },
  contentText: {
    fontSize: 14,
    color: COLORS.primary,
    width: "50%",
    textAlign: "right",
  },
  textContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 15,
  },
  section: {
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  inputsContainer: {
    marginBottom: 20,
    width: 250,
  },
  pinCodeContainer: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray,
  },
  pinCodeText: {
    backgroundColor: COLORS.white,
    color: COLORS.primary,
    borderWidth: 0,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 18,
  },
  focusStick: {
    backgroundColor: COLORS.primary,
  },
  activePinCodeContainer: {
    borderColor: COLORS.primary,
  },

  offlineContainer: {
    flex: 1,
    backgroundColor: "#fffbe6",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  offlineText: {
    fontSize: 16,
    color: "#cc0000",
    textAlign: "center",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
