import { Text, View, StyleSheet, Image } from "react-native";

export default function Index() {
    return (
        <View style={styles.container}>
            <Image
                source={require("../../../assets/images/adaptive-icon.png")}
                style={styles.image}
            />
            <Text style={styles.heading}>Your app starts here</Text>
            <Text style={styles.text}>
                In just a moment, you'll see your app begin to take shape.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        padding: 32,
    },
    heading: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        color: "#181818",
    },
    text: {
        fontSize: 18,
        fontWeight: "medium",
        textAlign: "center",
        color: "#4D4D4D",
    },
    image: {
        width: 80,
        height: 80,
        marginBottom: 16,
    },
});
