import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ImageViewer } from '@/components/ImageViewer';
import { CameraButton } from '@/components/CameraButton';
import * as ImagePicker from 'expo-image-picker';

const PlaceholderImage = require('@/assets/images/camera/background-image.png');

export default function CameraScreen() {
	const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);

	const onPickImageAsync = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			quality: 1,
		});

		if (!result.canceled) {
			// console.log(result);
			setSelectedImage(result.assets[0].uri);
		} else {
			alert('You cancelled the image picker.');
		}
	}

	return (
		<View style={styles.container}>
			<View style={styles.imageContainer}>
				<ImageViewer imgSource={PlaceholderImage} selectedImage={selectedImage} />
			</View>
			<View style={styles.footerContainer}>
				<CameraButton theme="primary" label="Choose a photo" onPress={onPickImageAsync}/>
				<CameraButton label="Use this photo" />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#25292e',
		alignItems: 'center',
	},
	imageContainer: {
		flex: 1,
		paddingTop: 28,
	},
	footerContainer: {
		flex: 1 / 3,
		alignItems: 'center',
	},
});