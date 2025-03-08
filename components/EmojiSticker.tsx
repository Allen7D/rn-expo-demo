import { View } from 'react-native';
import { type ImageSource } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type Props = {
	imageSize: number;
	stickerSource: ImageSource;
};

export default function EmojiSticker({ imageSize, stickerSource }: Props) {
	// useSharedValue 是一个共享值（在写法上比 useEffect 添加依赖更加优雅）
	const scaleImage = useSharedValue(imageSize);
	// 贴纸的移动位置（X 和 Y）
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);

	// 通过 numberOfTaps 方法来指定双击手势
	const doubleTap = Gesture.Tap()
		.numberOfTaps(2)
		.onStart(() => {
			if (scaleImage.value !== imageSize * 2) {
				scaleImage.value = scaleImage.value * 2;
			} else {
				scaleImage.value = Math.round(scaleImage.value / 2);
			}
		});

	// 通过 Pan 方法来指定拖拽手势
	const drag = Gesture.Pan().onChange(event => {
		translateX.value += event.changeX;
		translateY.value += event.changeY;
	});

	const containerStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{
					translateX: translateX.value,
				},
				{
					translateY: translateY.value,
				},
			],
		};
	});

	// 尺寸的过渡动画
	const imageStyle = useAnimatedStyle(() => {
		return {
			width: withSpring(scaleImage.value),
			height: withSpring(scaleImage.value),
		};
	});

	return (
		<GestureDetector gesture={drag}>
			<Animated.View style={[containerStyle, { top: -350 }]}>
				<GestureDetector gesture={doubleTap}>
					<Animated.Image
						source={stickerSource}
						resizeMode="contain"
						style={imageStyle}
					/>
				</GestureDetector>
			</Animated.View>
		</GestureDetector>
	);
}