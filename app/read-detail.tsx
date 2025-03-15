import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Dimensions, View, Text } from 'react-native';
import { WebView } from "react-native-webview";

// const source = require('./test.pdf');  // ios only
// const source = {uri:'bundle-assets://test.pdf' };
// const source = {uri:'file:///sdcard/test.pdf'};
// const source = {uri:"data:application/pdf;base64,JVBERi0xLjcKJc..."};
// const source = {uri:"content://com.example.blobs/xxxxxxxx-...?offset=0&size=xxx"};
// const source = {uri:"blob:xxxxxxxx-...?offset=0&size=xxx"};

const source = { uri: 'https://reactnative.directory/?expoGo=true' };
// const source = { uri: 'http://samples.leanpub.com/thereactnativebook-sample.pdf', cache: true };

export default function ReadDetailScreen() {
	const params = useLocalSearchParams();

	return (
		<View style={styles.container}>
			<Text>{params.title}</Text>
			<Text>{params.pdfPath}</Text>
			<WebView style={styles.pdf} source={source} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginTop: 25,
	},
	pdf: {
		flex: 1,
		width: Dimensions.get('window').width,
		height: Dimensions.get('window').height,
	}
});